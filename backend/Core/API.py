import uvicorn
import asyncio
import zmq
import zmq.asyncio
import json
import logging
from pathlib import Path
from typing import Set, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

# Предполагаем, что IP, API_PORT и ZMQ_WORKER_PUSH_ADDR определены в backend
from backend import IP, API_PORT, ZMQ_WORKER_PUSH_ADDR
from logs import Log as logger


# ----------------------------------------------------------------------
# 0. НАСТРОЙКА ЛОГИРОВАНИЯ (Подавление служебных логов)
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
zmq_pull_task: Optional[asyncio.Task] = None

# ----------------------------------------------------------------------
# 2. АБСОЛЮТНЫЙ ПУТЬ, МОНТИРОВАНИЕ И ПЕРЕНАПРАВЛЕНИЕ
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
# 3. WebSocket Роут
# ----------------------------------------------------------------------

@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.add(websocket)
    logger.info(f"[API] [+] New WebSocket connection established. Total: {len(websocket_connections)}")

    try:
        # Цикл ожидания, который будет отменен при завершении сервера
        while True:
            # Ожидаем ввод от клиента, но игнорируем его на этом этапе
            await websocket.receive_text()

    except asyncio.CancelledError:
        # НОРМАЛЬНОЕ ЗАВЕРШЕНИЕ: Игнорируем отмену задачи при завершении
        pass
    except WebSocketDisconnect:
        logger.info(f"[API] [-] WebSocket connection closed. Total: {len(websocket_connections) - 1}")
    except Exception as e:
        logger.error(f"[API] [!] WebSocket error: {e}")
    finally:
        websocket_connections.discard(websocket)


# ----------------------------------------------------------------------
# 4. Задача ZeroMQ PULL (Для приема данных от воркеров)
# ----------------------------------------------------------------------

async def zmq_api_pull_task():
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = None

    try:
        pull_socket = zmq_ctx.socket(zmq.PULL)
        pull_socket.bind(ZMQ_WORKER_PUSH_ADDR)
        pull_socket.set_hwm(0)

        logger.info(f"[API] [+] ZeroMQ PULL socket bound to {ZMQ_WORKER_PUSH_ADDR}")

        while True:
            try:
                frames = await pull_socket.recv_multipart()
                if not frames:
                    continue

                # ПРЯМАЯ ПЕРЕСЫЛКА НА ФРОНТЕНД
                for ws in list(websocket_connections):
                    try:
                        # 1. Если сообщение JSON (один фрейм)
                        if len(frames) == 1:
                            message = frames[0].decode('utf-8')
                            await ws.send_text(message)

                        # 2. Если сообщение Multipart (Шапка + Байты)
                        elif len(frames) == 2:
                            header_json_str = frames[0].decode('utf-8')
                            data_bytes = frames[1]

                            # Отправляем шапку (текст) и данные (байты)
                            await ws.send_text(header_json_str)
                            await ws.send_bytes(data_bytes)

                    except Exception:
                        # Игнорируем ошибки отправки, если WS закрылся
                        pass

            except asyncio.CancelledError:
                break  # Выход из цикла при отмене задачи
            except Exception as e:
                logger.error(f"[API] [!] ZMQ PULL task inner loop error: {e}")
                await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        pass  # Задача отменена (нормальное завершение)
    except Exception as e:
        logger.critical(f"[API] [!!!] ZMQ PULL task FATAL error: {e}")
    finally:
        if pull_socket:
            pull_socket.close()
        zmq_ctx.term()
        logger.info("[API] [*] ZMQ PULL context terminated.")


# ----------------------------------------------------------------------
# 5. Функция для запуска FastAPI (ФИНАЛЬНАЯ УСТОЙЧИВАЯ ЛОГИКА ЗАВЕРШЕНИЯ)
# ----------------------------------------------------------------------

async def close_all_websockets():
    """
    Закрывает все активные WebSocket-соединения, защищаясь от CancelledError.
    Это необходимо, так как эта функция вызывается во время общей отмены.
    """
    global websocket_connections
    if not websocket_connections:
        return

    close_tasks = []
    for ws in list(websocket_connections):
        close_tasks.append(ws.close(code=1000))

    logger.info(f"[API] [*] Closing {len(websocket_connections)} active WebSocket connections...")

    # КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Защита await от внешней отмены
    try:
        await asyncio.gather(*close_tasks, return_exceptions=True)
    except asyncio.CancelledError:
        # Игнорируем отмену. Это означает, что главный цикл отменил нас
        # прямо во время закрытия, но мы уже инициировали закрытие.
        pass
    except Exception as e:
        logger.error(f"[API] [!] Error during WS gather: {e}")


@app.on_event("startup")
async def startup_event():
    """Запускает ZMQ PULL задачу при старте Uvicorn."""
    global zmq_pull_task
    # Предполагая, что zmq_api_pull_task() определен
    zmq_pull_task = asyncio.create_task(zmq_api_pull_task())


@app.on_event("shutdown")
async def shutdown_event():
    """
    Выполняется во время Uvicorn shutdown. Закрывает WS и ZMQ.
    """

    # 1. Принудительно закрываем WebSocket-соединения (защищено внутри функции)
    await close_all_websockets()

    # 2. Отменяем ZMQ-задачу
    global zmq_pull_task
    if zmq_pull_task and not zmq_pull_task.done():
        zmq_pull_task.cancel()
        try:
            # Ожидаем завершения ZMQ-задачи
            await zmq_pull_task
        except asyncio.CancelledError:
            # Это ожидаемое поведение: ZMQ-задача отменена
            pass
        except Exception as e:
            logger.warning(f"[API] [!] ZMQ PULL task failed during final await: {e}")


async def run_fastapi_server(host: str, port: int):
    """
    Финальная версия: Контролируемый запуск Uvicorn, защищенный от внешней отмены.
    Использует asyncio.shield для предотвращения CancelledError в Lifespan.
    """
    config = uvicorn.Config(
        "backend.Core.API:app",
        host=host,
        port=port,
        loop="asyncio",
        log_level="warning"
    )
    server = uvicorn.Server(config)

    # 1. Запускаем server.serve() как задачу.
    server_task = asyncio.create_task(server.serve())

    # 2. Оборачиваем задачу в shield, чтобы предотвратить ее отмену
    # внешним сигналом (от Main.py).
    shielded_task = asyncio.shield(server_task)

    try:
        # Ждем завершения shielded_task.
        await shielded_task

    except asyncio.CancelledError:
        # 3. Перехватываем CancelledError, инициированную Main.py.
        logger.info("[API] [*] Uvicorn server received external shutdown signal.")

        # 4. Вызываем server.shutdown().
        # @app.on_event("shutdown") уже очистил WS и ZMQ.
        try:
            # Убеждаемся, что задача Uvicorn существует и не завершена
            if not server_task.done():
                # Вызываем shutdown, чтобы инициировать процедуру завершения Starlette/ASGI.
                # Это должно завершиться чисто, хотя финальная трассировка Lifespan может остаться.
                await server.shutdown()

            logger.info("[API] [*] Uvicorn server successfully shut down.")
        except Exception as e:
            logger.error(f"[API] [!] Error during Uvicorn shutdown: {e}")

    except Exception as e:
        logger.error(f"[API] [!!!] Fatal error during server serve: {e}")