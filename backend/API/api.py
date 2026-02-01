# backend/API/API.py

import uvicorn
import asyncio
import logging
import json
from typing import Set, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pathlib import Path

from .ZmqDispatcher import zmq_pull_task_loop
from backend.Services import list_clients
from backend import IP, API_PORT, ZMQ_WORKER_PUSH_API
from logs import Log as logger


# --- 1. Конфигурация логирования Uvicorn ---

class SuppressInfoLogFilter(logging.Filter):
    def filter(self, record):
        if record.args and len(record.args) > 1:
            try:
                status_code = int(record.args[1])
                if 200 <= status_code < 400:
                    return 0
            except (ValueError, IndexError):
                pass
        return 1


uvicorn_access_logger = logging.getLogger("uvicorn.access")
if not any(isinstance(f, SuppressInfoLogFilter) for f in uvicorn_access_logger.filters):
    uvicorn_access_logger.addFilter(SuppressInfoLogFilter())

logging.getLogger("starlette").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)


# --- 2. Вспомогательные функции ---

def pack_api_message(client_id: str, module_name: str, data: Any) -> bytes:
    """
    Упаковывает системные данные (например, список клиентов) в единый бинарный протокол.
    Формат: [ID_len(1)][ID][Mod_len(1)][Mod][Payload_len(4)][Payload]
    """
    id_b = client_id.encode('utf-8')
    mod_b = module_name.encode('utf-8')
    # Системные данные от сервера всегда пакуем в JSON
    pay_b = json.dumps(data).encode('utf-8')

    return (
            len(id_b).to_bytes(1, byteorder='big') + id_b +
            len(mod_b).to_bytes(1, byteorder='big') + mod_b +
            len(pay_b).to_bytes(4, byteorder='big') + pay_b
    )


# --- 3. Инициализация FastAPI ---

app = FastAPI()
websocket_connections: Set[WebSocket] = set()
zmq_pull_task_handle: asyncio.Task | None = None

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

app.mount("/ui", StaticFiles(directory=FRONTEND_DIR, html=False), name="static")


@app.get("/", include_in_schema=False)
async def redirect_to_dashboard():
    return RedirectResponse(url="/ui/dashboard/dashboard.html")


# --- 4. Обработчик WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.add(websocket)
    logger.info(f"[API] [+] New WebSocket connection. Total: {len(websocket_connections)}")

    # Отправка стартового списка клиентов
    try:
        current_clients = list_clients()
        if current_clients:
            # SERVER — это зарезервированный ID для системных уведомлений
            encoded_message = pack_api_message(
                client_id="SERVER",
                module_name="ClientList",
                data=current_clients
            )
            await websocket.send_bytes(encoded_message)
            logger.debug(f"[API] Initial client list sent to WS.")
    except Exception as e:
        logger.error(f"[API] Error sending startup client list: {e}")

    try:
        while True:
            # Ожидаем пакеты (PING или Disconnect)
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        logger.error(f"[API] WebSocket loop error: {e}")
    finally:
        websocket_connections.discard(websocket)
        logger.info(f"[API] [-] WebSocket closed. Remaining: {len(websocket_connections)}")


# --- 5. Жизненный цикл (Startup/Shutdown) ---

@app.on_event("startup")
async def startup_event():
    global zmq_pull_task_handle
    zmq_pull_task_handle = asyncio.create_task(
        zmq_pull_task_loop(websocket_connections, ZMQ_WORKER_PUSH_API)
    )
    logger.info("[API] [*] ZMQ PULL dispatcher started.")


@app.on_event("shutdown")
async def shutdown_event():
    global zmq_pull_task_handle

    # Закрываем все WS
    if websocket_connections:
        close_tasks = [ws.close(code=1000) for ws in list(websocket_connections)]
        await asyncio.gather(*close_tasks, return_exceptions=True)

    # Останавливаем ZMQ задачу
    if zmq_pull_task_handle and not zmq_pull_task_handle.done():
        zmq_pull_task_handle.cancel()
        try:
            await zmq_pull_task_handle
        except asyncio.CancelledError:
            pass
    logger.info("[API] [*] Shutdown complete.")


# --- 6. Запуск ---

async def run_fastapi_server(host: str, port: int):
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        loop="asyncio",
        log_level="warning"
    )
    server = uvicorn.Server(config)
    await server.serve()