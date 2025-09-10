import asyncio
from loguru import logger

if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt as e:
        logger.info(f"[*] Сервер остановлен вручную: {e}")