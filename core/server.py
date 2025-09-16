import asyncio
import multiprocessing
from loguru import logger
from config import IP, PORT, NUM_WORKERS
from .client_connection import client_handler
from .ui import operator_interface
from .queue_worker import module_worker

async def start_server():
    server = await asyncio.start_server(client_handler, IP, PORT, reuse_address=True, backlog=1000)
    addr = server.sockets[0].getsockname()
    logger.info(f'[+]Server started on {addr}')

    process = []
    for _ in range(NUM_WORKERS):
        p = multiprocessing.Process(target=module_worker)
        p.start()
        process.append(p)

    operator_task = asyncio.create_task(operator_interface(server))

    async with server:
        try:
            await asyncio.gather(server.serve_forever(), operator_task)
        except asyncio.CancelledError as e:
            logger.info(f"[*] asyncio.CancelledError: {e}")
        finally:
            for p in process:
                p.terminate()
                p.join()