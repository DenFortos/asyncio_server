# backend/API/API.py (ФИНАЛЬНАЯ ВЕРСИЯ)

import uvicorn
import asyncio
import zmq
import zmq.asyncio
import json
import logging
import time
import struct
from pathlib import Path
from typing import Set, Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

# Импортируем наш диспетчер и службы
from .ZmqDispatcher import zmq_pull_task_loop, encode_to_binary_protocol
# Импортируем list_clients для отправки начального списка на фронтенд
from backend.Services import list_clients

# Предполагаем, что IP, API_PORT и ZMQ_WORKER_PUSH_API определены в backend
from backend import IP, API_PORT, ZMQ_WORKER_PUSH_API
from logs import Log as logger


# ----------------------------------------------------------------------
# 0. НАСТРОЙКА ЛОГИРОВАНИЯ (Остается без изменений)
# ----------------------------------------------------------------------

# Фильтр для подавления HTTP-логов Uvicorn (статусы 2xx и 3xx)
class SuppressInfoLogFilter(logging.Filter):
    def filter(self, record):
        if record.args and len(record.args) > 1:
            try:
                # Подавляем только статусы 2xx и 3xx
                status_code = int(record.args[1])
                if 200 <= status_code < 400:
                    return 0
            except ValueError:
                pass
        return 1


# Применяем фильтр к логгеру доступа Uvicorn
uvicorn_access_logger = logging.getLogger("uvicorn.access")
if not any(isinstance(f, SuppressInfoLogFilter) for f in uvicorn_access_logger.filters):
    uvicorn_access_logger.addFilter(SuppressInfoLogFilter())

# Подавляем информационные логи Starlette/Uvicorn о запуске
logging.getLogger("starlette").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)

# --- 1. Инициализация FastAPI ---
app = FastAPI()
websocket_connections: Set[WebSocket] = set()

# Глобальная переменная для ZMQ-задачи
zmq_pull_task_handle: Optional[asyncio.Task] = None

# ----------------------------------------------------------------------
# 2. АБСОЛЮТНЫЙ ПУТЬ, МОНТИРОВАНИЕ И ПЕРЕНАПРАВЛЕНИЕ (Остается без изменений)
# ----------------------------------------------------------------------

# Вычисляем абсолютный путь к папке 'frontend'
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
# Используем 'frontend' как предполагаемую папку вашего UI
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Монтируем статику на префикс /ui/
app.mount(
    "/ui",
    StaticFiles(directory=FRONTEND_DIR, html=False),
    name="static"
)


@app.get("/", include_in_schema=False)
async def redirect_to_dashboard():
    return RedirectResponse(url="/ui/dashboard/dashboard.html")


# ----------------------------------------------------------------------
# 3. WebSocket Роут (КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ЗДЕСЬ)
# ----------------------------------------------------------------------

# 🚨 ИСПРАВЛЕНИЕ 1: Изменено с /ws/feed на /ws для соответствия фронтенду
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.add(websocket)
    logger.info(f"[API] [+] New WebSocket connection established. Total: {len(websocket_connections)}")

    # Код для отправки текущего списка клиентов (СТАРТОВАЯ СИНХРОНИЗАЦИЯ)
    try:
        current_clients = list_clients()
        if current_clients:
            payload_bytes = json.dumps(current_clients).encode('utf-8')
            encoded_message = encode_to_binary_protocol(
                client_id="SERVER",
                module_name="ClientList",
                payload_bytes=payload_bytes
            )
            await websocket.send_bytes(encoded_message)
            logger.debug(f"[API] Sent initial list of {len(current_clients)} clients to new WS.")

    except Exception as e:
        logger.error(f"[API] [!] Error sending startup client list: {e}")

    try:
        # Цикл ожидания, который будет поддерживать соединение и ловить PING/PONG
        while True:
            # 🚨 ИСПРАВЛЕНИЕ 2: Используем универсальный receive() для обработки
            # как текстовых, так и бинарных фреймов (PING/PONG) без ошибок.
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                # FastAPI автоматически поднимет WebSocketDisconnect, но явная проверка не помешает
                break

                # Игнорируем все входящие сообщения (PING, команды).
            # Это поддерживает соединение открытым и предотвращает ошибку 'text'.
            # При необходимости обработки команд, логику добавлять сюда.

    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect:
        logger.info(f"[API] [-] WebSocket connection closed. Total: {len(websocket_connections) - 1}")
    except Exception as e:
        # Здесь будут ловиться прочие ошибки соединения (например, 'text' если receive_text был бы)
        logger.error(f"[API] [!] WebSocket error: {e}")
    finally:
        websocket_connections.discard(websocket)


# ----------------------------------------------------------------------
# 4. Задача ZeroMQ PULL и Управление Жизненным Циклом (Остается без изменений)
# ----------------------------------------------------------------------

async def close_all_websockets():
    """
    Закрывает все активные WebSocket-соединения.
    """
    global websocket_connections
    if not websocket_connections:
        return

    close_tasks = []
    for ws in list(websocket_connections):
        close_tasks.append(ws.close(code=1000))

    logger.info(f"[API] [*] Closing {len(websocket_connections)} active WebSocket connections...")

    try:
        await asyncio.gather(*close_tasks, return_exceptions=True)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"[API] [!] Error during WS gather: {e}")


@app.on_event("startup")
async def startup_event():
    """Запускает ZMQ PULL диспетчер при старте Uvicorn."""
    global zmq_pull_task_handle

    # Запускаем импортированный цикл диспетчера, передавая ему
    # набор WS-соединений и адрес ZMQ.
    zmq_pull_task_handle = asyncio.create_task(
        zmq_pull_task_loop(websocket_connections, ZMQ_WORKER_PUSH_API)
    )


@app.on_event("shutdown")
async def shutdown_event():
    """
    Выполняется во время Uvicorn shutdown. Закрывает WS и ZMQ.
    """

    # 1. Принудительно закрываем WebSocket-соединения
    await close_all_websockets()

    # 2. Отменяем ZMQ-задачу
    global zmq_pull_task_handle
    if zmq_pull_task_handle and not zmq_pull_task_handle.done():
        zmq_pull_task_handle.cancel()
        try:
            # Ожидаем завершения ZMQ-задачи
            await zmq_pull_task_handle
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"[API] [!] ZMQ PULL task failed during final await: {e}")


async def run_fastapi_server(host: str, port: int):
    """
    Финальная версия: Контролируемый запуск Uvicorn.
    """
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        loop="asyncio",
        log_level="warning"
    )
    server = uvicorn.Server(config)

    server_task = asyncio.create_task(server.serve())
    shielded_task = asyncio.shield(server_task)

    try:
        await shielded_task

    except asyncio.CancelledError:
        logger.info("[API] [*] Uvicorn server received external shutdown signal.")
        try:
            if not server_task.done():
                await server.shutdown()
            logger.info("[API] [*] Uvicorn server successfully shut down.")
        except Exception as e:
            logger.error(f"[API] [!] Error during Uvicorn shutdown: {e}")

    except Exception as e:
        logger.error(f"[API] [!!!] Fatal error during server serve: {e}")