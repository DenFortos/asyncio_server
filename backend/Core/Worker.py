# backend/Core/Worker.py
import asyncio
import json
import zmq
import zmq.asyncio
import multiprocessing
from logs import Log as logger
from backend import ZMQ_CLIENT_PUSH_WORKER, ZMQ_WORKER_PUSH_API


async def worker_task(worker_id: str):
    zmq_ctx = zmq.asyncio.Context()

    # Принимаем пакеты от Core (Бот -> Core -> Worker)
    pull_socket = zmq_ctx.socket(zmq.PULL)
    pull_socket.connect(ZMQ_CLIENT_PUSH_WORKER)

    # Отправляем пакеты в API (Worker -> API -> Frontend)
    push_to_api_socket = zmq_ctx.socket(zmq.PUSH)
    push_to_api_socket.connect(ZMQ_WORKER_PUSH_API)

    # Ленивый импорт карты модулей
    from backend.Modules import module_map

    logger.info(f"[+] Worker {worker_id} запущен (Binary Pipeline Mode)")

    while True:
        try:
            # 1. Получаем цельный бинарный пакет от Core
            packet = await pull_socket.recv()
            if not packet:
                continue

            # --- ЧИТАЕМЫЙ ПАРСИНГ ПАКЕТА (Аналог read_full_packet) ---
            cursor = 0

            # Извлекаем ID клиента
            id_len = packet[cursor]
            id_bytes = packet[cursor + 1: cursor + 1 + id_len]
            client_id = id_bytes.decode('utf-8', errors='ignore')
            cursor += 1 + id_len

            # Извлекаем имя модуля
            mod_len = packet[cursor]
            mod_bytes = packet[cursor + 1: cursor + 1 + mod_len]
            module_name = mod_bytes.decode('utf-8', errors='ignore')
            cursor += 1 + mod_len

            # Извлекаем Payload длину и сами данные
            pay_len = int.from_bytes(packet[cursor: cursor + 4], byteorder='big')
            payload_data = packet[cursor + 4: cursor + 4 + pay_len]
            # Запоминаем позицию после заголовка для сборки ответа
            header_end_pos = cursor
            # --------------------------------------------------------

            # 2. Поиск функции модуля
            func = module_map.get(module_name)
            if not func:
                logger.warning(f"[Worker {worker_id}] Модуль '{module_name}' не найден")
                continue

            # 3. ПОДГОТОВКА ВХОДНЫХ ДАННЫХ
            if module_name == "DataScribe":
                try:
                    # Для системного модуля декодируем JSON
                    input_data = json.loads(payload_data.decode('utf-8'))
                except:
                    input_data = {}
            else:
                # Для всех остальных (скриншоты, файлы) — голые байты
                input_data = payload_data

            # 4. ВЫПОЛНЕНИЕ ЛОГИКИ (в отдельном потоке)
            result = await asyncio.to_thread(func, input_data)

            # 5. СБОРКА БИНАРНОГО ОТВЕТА ДЛЯ API
            if result is not None:
                # Жесткое разделение типов вывода
                if module_name == "DataScribe":
                    # Возвращаем JSON-байты
                    res_bytes = json.dumps(result).encode('utf-8')
                else:
                    # Возвращаем сырые байты (result уже должен быть bytes)
                    res_bytes = result if isinstance(result, bytes) else str(result).encode()

                # Формируем новую 4-байтовую длину
                res_len_bytes = len(res_bytes).to_bytes(4, byteorder='big')

                # Сборка: [ID_len][ID][Mod_len][Mod] + [New_Pay_Len] + [New_Payload]
                # Берем исходный заголовок из packet до начала поля длины
                final_packet = packet[0: header_end_pos] + res_len_bytes + res_bytes

                # Отправляем одним фреймом в API
                await push_to_api_socket.send(final_packet)

                logger.debug(f"[Worker {worker_id}] Обработан {module_name} для {client_id}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[Worker {worker_id}] Критическая ошибка: {e}")
            await asyncio.sleep(0.1)

    push_to_api_socket.close()
    pull_socket.close()
    zmq_ctx.term()


def module_worker(log_queue):
    """ Точка входа для multiprocessing.Process """
    worker_id = multiprocessing.current_process().name
    logger.for_worker(log_queue)
    asyncio.run(worker_task(worker_id))