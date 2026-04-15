# backend\Main.py
import asyncio, sys, logs.LoggerWrapper as logger
from backend.Core.Server import start_server

if sys.platform == "win32": asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    logger.Log.setup(log_file_path="server.log")
    try: await start_server()
    except (KeyboardInterrupt, asyncio.CancelledError): pass

if __name__ == "__main__": asyncio.run(main())