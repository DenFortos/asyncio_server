import asyncio
import sys
from LoggerWrapper import Log as logger
from Core import start_server

if sys.platform.startswith("win"): # FIX для Windows + ZeroMQ
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logger.setup(sys.stdout) # Если нужно настроить вывод, делаем это через метод класса/обёртки

if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt as e:
        logger.info(f"[*] KeyboardInterrupt: {e}")