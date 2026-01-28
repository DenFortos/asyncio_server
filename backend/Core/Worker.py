# backend/Core/Worker.py
import asyncio
import json
import zmq
import zmq.asyncio
import multiprocessing
import time
from logs import Log as logger
from backend import ZMQ_CLIENT_PUSH_WORKER, ZMQ_WORKER_PUSH_API

async def worker_task(worker_id: str):
    zmq_ctx = zmq.asyncio.Context()

    pull_socket = zmq_ctx.socket(zmq.PULL)
    pull_socket.connect(ZMQ_CLIENT_PUSH_WORKER)

    push_to_api_socket = zmq_ctx.socket(zmq.PUSH)
    push_to_api_socket.connect(ZMQ_WORKER_PUSH_API)

    from backend.Modules import module_map

    logger.info(f"[+] Worker {worker_id} started. Pulling from {ZMQ_CLIENT_PUSH_WORKER}")

    while True:
        try:
            frames = await pull_socket.recv_multipart()
            if len(frames) < 2:
                continue

            # 1. Парсим заголовок
            header = json.loads(frames[0].decode('utf-8'))
            client_id = header.get("client_id", "?")
            module_name = header.get("module", "")
            incoming_payload_size = header.get("size", 0)

            # 2. Ищем функцию модуля
            func = module_map.get(module_name)
            if not func:
                logger.warning(f"[Worker {worker_id}] Unknown module '{module_name}'")
                continue

            # 3. Извлекаем payload (БЕЗ b''.join, просто берем второй фрейм)
            full_payload = frames[1]

            if len(full_payload) != incoming_payload_size:
                logger.error(f"[Worker {worker_id}] Size mismatch for {module_name}")
                continue

            # 4. Декодирование (Доверяем клиенту на 100%)
            if module_name == "DataScribe":
                # Сразу превращаем в словарь, так как знаем, что там JSON
                decoded_payload = json.loads(full_payload.decode('utf-8'))
            else:
                # Для всех остальных модулей просто прокидываем байты
                decoded_payload = full_payload

            # 5. Вызываем функцию модуля
            result = await asyncio.to_thread(func, decoded_payload)

            # 6. ОТПРАВКА РЕЗУЛЬТАТА В API
            if result is not None:
                # Если это DataScribe, превращаем словарь в байты JSON.
                # Для всего остального считаем, что модуль уже вернул байты (bytes).
                res_bytes = json.dumps(result).encode('utf-8') if module_name == "DataScribe" else result

                # Формируем минимальную шапку
                response_header = {
                    "client_id": client_id,
                    "module": module_name,
                    "size": len(res_bytes)
                }

                # Отправляем два фрейма: [Шапка JSON] [Данные байты]
                await push_to_api_socket.send_multipart([
                    json.dumps(response_header).encode('utf-8'),
                    res_bytes
                ])

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[Worker {worker_id}] General error: {e}")
            await asyncio.sleep(0.01)

    push_to_api_socket.close()
    pull_socket.close()
    zmq_ctx.term()

def module_worker(log_queue):
    worker_id = multiprocessing.current_process().name
    logger.for_worker(log_queue)
    asyncio.run(worker_task(worker_id))
