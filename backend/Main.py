import asyncio
import sys
from logs import Log as logger
from backend.Core.Server import start_server

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    logger.setup(log_file_path="server.log")
    try:
        # Прямой запуск сервера. CLI и API должны запускаться внутри start_server
        await start_server()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    asyncio.run(main())