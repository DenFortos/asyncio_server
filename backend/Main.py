# backend/Main.py

import asyncio
import sys
from pathlib import Path

from backend.Config import STORAGE_DIR
import backend.LoggerWrapper as logger

# Первоочередная настройка логирования до импорта тяжелых модулей
logger.Log.setup(log_file_path=str(STORAGE_DIR / "server.log"))

# Импорт сервера происходит строго ПОСЛЕ инициализации логгера
from backend.Core.Server import start_server

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main() -> None:
    """
    Главная асинхронная точка входа в приложение.
    
    Схема работы:
    [Initialize Logger] -> [Import Modules] -> [Start Engine] -> [Handle Exceptions]
    """
    try:
        await start_server()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.Log.info("[Main] Server process interrupted by user.")
    except Exception as error:
        logger.Log.critical(f"[Main] FATAL Crash: {error}")

if __name__ == "__main__":
    asyncio.run(main())