import asyncio
import multiprocessing
from loguru import logger
import zmq
import zmq.asyncio

from config import IP, PORT, NUM_WORKERS
from .client_connection import client_handler  # теперь принимает push_socket как аргумент
from .ui import operator_interface
from .queue_worker import module_worker

async def start_server():
    # --- Создание и биндинг ZeroMQ PUSH сокета ---
    zmq_ctx = zmq.asyncio.Context()
    push_socket = zmq_ctx.socket(zmq.PUSH)
    push_socket.bind("tcp://188.190.156.120:5555")  # bind один раз для всех воркеров
    logger.info("[+] ZeroMQ PUSH socket bound to tcp://188.190.156.120:5555")

    # --- Запуск TCP сервера ---
    server = await asyncio.start_server(
        lambda r, w: client_handler(r, w, push_socket),
        IP,
        PORT,
        reuse_address=True,
        backlog=1000
    )
    addr = server.sockets[0].getsockname()
    logger.info(f"[+] Server started on {addr}")

    # --- Запуск воркеров ---
    process_list = []
    for _ in range(NUM_WORKERS):
        p = multiprocessing.Process(target=module_worker)
        p.start()
        process_list.append(p)
    logger.info(f"[+] {NUM_WORKERS} worker processes started")

    # --- Запуск интерфейса оператора ---
    operator_task = asyncio.create_task(operator_interface(server))

    # --- Главный цикл сервера ---
    async with server:
        try:
            await asyncio.gather(server.serve_forever(), operator_task)
        except asyncio.CancelledError as e:
            logger.info(f"[*] asyncio.CancelledError: {e}")
        finally:
            for p in process_list:
                p.terminate()
                p.join()
            logger.info("[*] All workers terminated")
            push_socket.close()
            zmq_ctx.term()
            logger.info("[*] ZeroMQ context terminated")
