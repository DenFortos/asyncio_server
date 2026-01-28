# backend/API/API.py (Оптимизированная версия)

import uvicorn
import asyncio
import logging
from typing import Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from .ZmqDispatcher import zmq_pull_task_loop, encode_to_binary_protocol
from backend.Services import list_clients
from backend import IP, API_PORT, ZMQ_WORKER_PUSH_API
from logs import Log as logger


# --- 1. Конфигурация логирования Uvicorn ---

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


# Применяем фильтр и подавляем лишние информационные логи
uvicorn_access_logger = logging.getLogger("uvicorn.access")
if not any(isinstance(f, SuppressInfoLogFilter) for f in uvicorn_access_logger.filters):
    uvicorn_access_logger.addFilter(SuppressInfoLogFilter())

logging.getLogger("starlette").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)

# --- 2. Инициализация FastAPI и глобальных переменных ---

app = FastAPI()
# Набор активных WebSocket-соединений
websocket_connections: Set[WebSocket] = set()
# Глобальная переменная для ZMQ-задачи
zmq_pull_task_handle: asyncio.Task | None = None

# --- 3. Настройка статических файлов и маршрутов ---

# Определяем абсолютный путь к папке 'frontend'
# Заменено на более чистый способ извлечения пути из app
# from pathlib import Path импортирован выше.

# NOTE: Путь к FRONTEND_DIR должен быть определен корректно в вашем проекте.
# В текущем коде он был завязан на app, я вернул Path для примера.
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Монтируем статику на префикс /ui/
app.mount("/ui", StaticFiles(directory=FRONTEND_DIR, html=False), name="static")


@app.get("/", include_in_schema=False)
async def redirect_to_dashboard():
    """Перенаправляет корневой URL на страницу дашборда."""
    return RedirectResponse(url="/ui/dashboard/dashboard.html")


# --- 4. Обработчик WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.add(websocket)
    logger.info(f"[API] [+] New WebSocket connection established. Total: {len(websocket_connections)}")

    # Отправка текущего списка клиентов при подключении (Стартовая синхронизация)
    try:
        current_clients = list_clients()
        if current_clients:
            # NOTE: json импортирован выше. encode_to_binary_protocol импортирован выше.
            import json
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
        # Цикл ожидания, который поддерживает соединение активным
        while True:
            # NOTE: Используем универсальный receive() для PING/PONG без ошибок.
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break

    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect:
        logger.info(f"[API] [-] WebSocket connection closed. Total: {len(websocket_connections) - 1}")
    except Exception as e:
        logger.error(f"[API] [!] WebSocket error: {e}")
    finally:
        websocket_connections.discard(websocket)


# --- 5. Обработчики событий запуска и остановки (Startup/Shutdown) ---

@app.on_event("startup")
async def startup_event():
    """Запускает ZMQ PULL диспетчер при старте Uvicorn."""
    global zmq_pull_task_handle

    zmq_pull_task_handle = asyncio.create_task(
        zmq_pull_task_loop(websocket_connections, ZMQ_WORKER_PUSH_API)
    )
    logger.info("[API] [*] ZMQ PULL task initiated.")


@app.on_event("shutdown")
async def shutdown_event():
    """Выполняется во время Uvicorn shutdown. Закрывает WS и ZMQ."""
    global zmq_pull_task_handle

    # Принудительно закрываем WebSocket-соединения
    await close_all_websockets()

    # Отменяем ZMQ-задачу
    if zmq_pull_task_handle and not zmq_pull_task_handle.done():
        zmq_pull_task_handle.cancel()
        try:
            await zmq_pull_task_handle
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"[API] [!] ZMQ PULL task failed during final await: {e}")


async def close_all_websockets():
    """Закрывает все активные WebSocket-соединения."""
    global websocket_connections
    if not websocket_connections:
        return

    close_tasks = [ws.close(code=1000) for ws in list(websocket_connections)]
    logger.info(f"[API] [*] Closing {len(websocket_connections)} active WebSocket connections...")

    try:
        await asyncio.gather(*close_tasks, return_exceptions=True)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"[API] [!] Error during WS gather: {e}")


# --- 6. Функция запуска сервера Uvicorn ---

async def run_fastapi_server(host: str, port: int):
    """Контролируемый запуск Uvicorn."""
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
