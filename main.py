import asyncio
import sys
from loguru import logger
from core import start_server

# --- FIX для Windows + ZeroMQ ---
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logger.remove()
logger.add(sys.stdout, colorize=True, format="{time:HH:mm:ss} | {level} | {message}", enqueue=True)

if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt as e:
        logger.info(f"[*] KeyboardInterrupt: {e}")