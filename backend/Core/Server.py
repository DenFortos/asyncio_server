# backend/Core/Server.py

import asyncio
import multiprocessing
import webbrowser

from logs import Log as logger
from backend import IP, PORT, API_PORT
from backend.API import run_fastapi_server
from backend import start_benchmark
from .ClientConnection import client_handler

async def start_server():
    """Инициализирует C2 сервер, API и систему логирования"""
    log_queue = multiprocessing.Queue()

    # 1. Запуск TCP сервера для ботов
    server = await asyncio.start_server(
        client_handler,
        IP, PORT,
        reuse_address=True,
        backlog=1000,
        limit=5242880  # 5 MB буфер
    )

    addr = server.sockets[0].getsockname()
    logger.info(f"[+] TCP C2 Server: {addr}")

    # 2. Запуск фоновых сервисов
    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))
    api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))

    # 3. Инструментарий и Dashboard
    start_benchmark(asyncio.get_running_loop(), interval=1)
    webbrowser.open(f"http://{IP}:{API_PORT}/")
    logger.info(f"[*] Dashboard: http://{IP}:{API_PORT}")

    async with server:
        try:
            await asyncio.gather(server.serve_forever(), log_task, api_task)
        except asyncio.CancelledError:
            logger.info("[*] Shutdown initiated.")
        finally:
            await _shutdown(log_queue, api_task, log_task)

async def _shutdown(q, api, logs):
    """Корректное закрытие всех очередей и тасков"""
    q.put("STOP")
    api.cancel()
    await asyncio.gather(logs, api, return_exceptions=True)
    logger.info("[*] Server stopped.")