# backend/Main.py

import asyncio
import sys
from pathlib import Path

from backend.Config import STORAGE_DIR
import backend.LoggerWrapper as logger

logger.Log.setup(log_file_path=str(STORAGE_DIR / "server.log"))

from backend.Core.Server import start_server


if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def main() -> None:
    """
    Главная асинхронная точка входа в приложение.
    
    Схема работы:
    [Start Server] -> [Event Loop] -> [Handle Interrupts]
    """
    try:
        await start_server()
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass
    except Exception as error:
        logger.Log.critical(f"[Main] FATAL Crash: {error}")


if __name__ == "__main__":
    asyncio.run(main())