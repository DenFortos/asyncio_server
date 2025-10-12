import asyncio
import json
import zmq
import zmq.asyncio
import multiprocessing
import time
from logs import Log as logger
# Импортируем адреса из твоего конфигурационного файла
from backend import ZMQ_PUSH_PULL_ADDR, ZMQ_WORKER_PUSH_ADDR


# --- Главная асинхронная задача воркера ---
async def worker_task(worker_id: str):
    # 1. Инициализация ZeroMQ сокетов
    zmq_ctx = zmq.asyncio.Context()

    # Сокет для приема задач от ClientHandler
    pull_socket = zmq_ctx.socket(zmq.PULL)
    pull_socket.connect(ZMQ_PUSH_PULL_ADDR)

    # Сокет для отправки результатов в API/FastAPI (PUSH)
    push_to_api_socket = zmq_ctx.socket(zmq.PUSH)
    push_to_api_socket.connect(ZMQ_WORKER_PUSH_ADDR)

    # Важное замечание: я предполагаю, что все эти модули импортируются корректно
    # Импортируем модули, использующие функцию asyncio.to_thread
    from backend.Modules import module_map, data_scribe, screen_watch, bin_stream, echo_tap, cam_gaze, input_forge

    logger.info(
        f"[+] Worker {worker_id} started. Pulling from {ZMQ_PUSH_PULL_ADDR} and PUSHing to {ZMQ_WORKER_PUSH_ADDR}")

    while True:
        try:
            # 1. Прием задачи от ClientHandler
            frames = await pull_socket.recv_multipart()
            if not frames:
                continue

            # 2. Читаем и парсим унифицированный заголовок (Header JSON)
            # Заголовок - это Фрейм 0
            header_json_str = frames[0].decode('utf-8')
            header = json.loads(header_json_str)

            client_id = header.get("client_id", "?")
            # Используем унифицированное поле "module"
            module_name = header.get("module", "")
            # Используем унифицированное поле "size" (старое payload_len)
            incoming_payload_size = header.get("size", 0)

            # 3. Ищем функцию модуля
            func = module_map.get(module_name)
            if not func:
                logger.warning(
                    f"[Worker {worker_id}] Unknown module '{module_name}' from client {client_id}. Ignoring."
                )
                continue

            # 4. Собираем все чанки в один полный payload (Фреймы 1 и далее)
            full_payload = b''.join(frames[1:])

            if len(full_payload) != incoming_payload_size:
                logger.error(
                    f"[Worker {worker_id}] Size mismatch for module '{module_name}' from client {client_id}. "
                    f"Expected: {incoming_payload_size} bytes, Received: {len(full_payload)} bytes."
                )
                continue

            # Если payload - JSON, декодируем его перед передачей в функцию модуля.
            # Если payload - бинарные данные, передаем как есть.
            if header.get("type") == "json":
                try:
                    # ВАЖНО: Модуль ожидает JSON-объект или текстовую строку.
                    decoded_payload = json.loads(full_payload.decode('utf-8'))
                except json.JSONDecodeError:
                    # Если модуль ожидал JSON, а пришла ерунда
                    logger.error(
                        f"[Worker {worker_id}] Failed to decode JSON payload for {module_name} from {client_id}.")
                    continue
            else:
                decoded_payload = full_payload  # Бинарные данные

            # 5. Вызываем функцию модуля ОДИН РАЗ
            result = None
            try:
                # ВАЖНО: Выносим CPU-интенсивную обработку в отдельный поток
                result = await asyncio.to_thread(func, decoded_payload)

            except Exception as e:
                logger.error(
                    f"[Worker {worker_id}] Error executing module '{module_name}' for client {client_id}: {e}"
                )

            # 6. ОТПРАВКА РЕЗУЛЬТАТА В API/ФРОНТЕНД (УНИФИЦИРОВАННАЯ ЛОГИКА)
            if result is not None:
                is_binary = module_name in ["screen_watch", "cam_gaze", "bin_stream"]
                response_type = "binary" if is_binary else "json"

                # --- A. Формирование Payload ---
                if is_binary:
                    # Чистые бинарные данные
                    response_payload = result
                else:
                    # Текст или JSON-сериализуемый словарь. Оборачиваем, если это не словарь.
                    if not isinstance(result, (dict, list)):
                        data_to_serialize = {"result": result}
                    else:
                        data_to_serialize = result

                    # Полезная нагрузка - это JSON-строка в байтах
                    response_payload = json.dumps(data_to_serialize).encode('utf-8')

                    # --- B. Формирование Header ---
                response_header = {
                    "client_id": client_id,
                    "module": module_name,
                    "timestamp": time.time(),
                    "type": response_type,
                    "size": len(response_payload)
                }

                # --- C. Отправка (ВСЕГДА ZMQ Multipart) ---
                await push_to_api_socket.send_multipart([
                    json.dumps(response_header).encode('utf-8'),
                    response_payload  # Фрейм 1: Сырые байты (JSON-строка или бинарные данные)
                ])

        # Обработка ошибок
        except asyncio.CancelledError:
            break
        except json.JSONDecodeError as e:
            logger.error(f"[Worker {worker_id}] Error decoding ZMQ header: {e}")
        except Exception as e:
            logger.error(f"[Worker {worker_id}] General error: {e}")
            await asyncio.sleep(0.01)

    # 7. Очистка ресурсов
    push_to_api_socket.close()
    pull_socket.close()
    zmq_ctx.term()


# --- Входная точка для процесса multiprocessing ---
def module_worker(log_queue):
    worker_id = multiprocessing.current_process().name
    logger.for_worker(log_queue)
    asyncio.run(worker_task(worker_id))