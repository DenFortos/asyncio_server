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
    from backend.Modules import module_map, data_scribe, screen_watch, bin_stream, echo_tap, cam_gaze, input_forge

    logger.info(
        f"[+] Worker {worker_id} started. Pulling from {ZMQ_PUSH_PULL_ADDR} and PUSHing to {ZMQ_WORKER_PUSH_ADDR}")

    while True:
        try:
            # 1. Прием задачи от ClientHandler
            frames = await pull_socket.recv_multipart()
            if not frames:
                continue

            # 2. Читаем и парсим заголовок (header)
            # Явно декодируем первый фрейм (JSON-строку) перед парсингом
            header = json.loads(frames[0].decode('utf-8'))
            client_id = header.get("client_id", "?")
            module_name = header.get("module_name", "")
            payload_len = header.get("payload_len", 0)

            # 3. Ищем функцию модуля
            func = module_map.get(module_name)
            if not func:
                logger.warning(
                    f"[Worker {worker_id}] Unknown module '{module_name}' from client {client_id}. Ignoring."
                )
                continue

            # 4. Собираем все чанки в один полный payload
            full_payload = b''.join(frames[1:])

            if len(full_payload) != payload_len:
                logger.error(
                    f"[Worker {worker_id}] Size mismatch for module '{module_name}' from client {client_id}. "
                    f"Expected: {payload_len} bytes, Received: {len(full_payload)} bytes."
                )
                continue

            # 5. Вызываем функцию модуля ОДИН РАЗ с полным payload
            result = None
            try:
                # ВАЖНО: Выносим CPU-интенсивную обработку в отдельный поток
                result = await asyncio.to_thread(func, full_payload)

            except Exception as e:
                logger.error(
                    f"[Worker {worker_id}] Error executing module '{module_name}' for client {client_id}: {e}"
                )

            # 6. ОТПРАВКА РЕЗУЛЬТАТА В API/ФРОНТЕНД
            if result is not None:

                # A. Модули, возвращающие чистые бинарные данные (стриминг)
                if module_name in ["screen_watch", "cam_gaze", "bin_stream"]:

                    response_header = {
                        "client_id": client_id,
                        "module": module_name,
                        "timestamp": time.time(),
                        "type": "binary",  # Фронтенд: ожидай байты
                        "size": len(result)
                    }
                    await push_to_api_socket.send_multipart([
                        json.dumps(response_header).encode('utf-8'),
                        result  # Сырые байты
                    ])

                # B. Модули, возвращающие текст или JSON-сериализуемый словарь
                else:
                    response_data = {
                        "client_id": client_id,
                        "module": module_name,
                        "timestamp": time.time(),
                        "type": "json",  # Фронтенд: ожидай JSON
                        "data": result  # Результат (текст/словарь)
                    }
                    await push_to_api_socket.send_json(response_data)

        # Обработка ошибок
        except asyncio.CancelledError:
            # Завершение цикла при получении сигнала от multiprocessing.Process.terminate()
            break
        except json.JSONDecodeError as e:
            logger.error(f"[Worker {worker_id}] Error decoding header: {e}")
        except Exception as e:
            logger.error(f"[Worker {worker_id}] General error: {e}")
            await asyncio.sleep(0.01)  # Небольшая пауза перед повторной попыткой

    # 6. Очистка ресурсов
    push_to_api_socket.close()
    pull_socket.close()
    zmq_ctx.term()


# --- Входная точка для процесса multiprocessing ---
def module_worker(log_queue):
    worker_id = multiprocessing.current_process().name
    logger.for_worker(log_queue)
    # Запускаем асинхронный цикл и worker_task
    asyncio.run(worker_task(worker_id))