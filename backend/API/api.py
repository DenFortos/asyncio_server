import uvicorn
import asyncio
import logging
from typing import Dict
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

# Импорты твоих модулей
from .Database import verify_user, register_user, load_db
from .ZmqDispatcher import zmq_pull_task_loop
from backend import ZMQ_WORKER_PUSH_API
from logs import Log as logger


# --- 1. Конфигурация логирования Uvicorn ---

class SuppressInfoLogFilter(logging.Filter):
    def filter(self, record):
        if record.args and len(record.args) > 1:
            try:
                status_code = int(record.args[1])
                if 200 <= status_code < 400: return 0
            except:
                pass
        return 1


uvicorn_access_logger = logging.getLogger("uvicorn.access")
if not any(isinstance(f, SuppressInfoLogFilter) for f in uvicorn_access_logger.filters):
    uvicorn_access_logger.addFilter(SuppressInfoLogFilter())

logging.getLogger("starlette").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)

# --- 2. Управление жизненным циклом (Lifespan) ---

# Глобальное хранилище активных сессий
active_connections: Dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # [STARTUP] Запуск фонового диспетчера ZMQ
    logger.info(f"[API] Запуск ZMQ Dispatcher на {ZMQ_WORKER_PUSH_API}...")
    zmq_task = asyncio.create_task(
        zmq_pull_task_loop(active_connections, ZMQ_WORKER_PUSH_API)
    )

    yield  # Здесь приложение работает

    # [SHUTDOWN] Остановка задач
    logger.info("[API] Остановка сервера и ZMQ задач...")
    zmq_task.cancel()
    try:
        await zmq_task
    except asyncio.CancelledError:
        pass
    logger.info("[API] Все фоновые задачи завершены.")


# --- 3. Инициализация приложения ---

app = FastAPI(lifespan=lifespan)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

app.mount("/ui", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


# --- 4. Роуты навигации и авторизации ---

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/ui/auth/auth.html")


@app.post("/register")
async def api_register(data: dict = Body(...)):
    login = data.get("login")
    password = data.get("password")
    if register_user(login, password):
        logger.info(f"[API] [+] Новый пользователь: {login}")
        return {"status": "ok"}
    return {"status": "error", "message": "User already exists"}


@app.post("/login")
async def api_login(data: dict = Body(...)):
    user = verify_user(data.get("login"), data.get("password"))
    if user:
        logger.info(f"[API] [✓] Вход: {data.get('login')}")
        return {
            "status": "ok",
            "role": user["role"],
            "prefix": user["prefix"]
        }
    return {"status": "error", "message": "Invalid login or password"}


# --- 5. WebSocket ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, login: str = Query(None)):
    # 1. Проверяем наличие логина
    if not login:
        logger.warning("[API] WS Connection rejected: No login provided")
        await websocket.close(code=1008)
        return

    # 2. ЗАГРУЖАЕМ ДАННЫЕ ИЗ БАЗЫ (Этого не хватало)
    db = load_db()
    user_info = db.get(login)

    if not user_info:
        logger.warning(f"[API] WS Reject: User {login} not found in DB")
        await websocket.close(code=1008)
        return

    await websocket.accept()

    # 3. Добавляем в список активных подключений
    if login not in active_connections:
        active_connections[login] = {
            "sockets": [],
            "role": user_info["role"],
            "prefix": user_info["prefix"]
        }

    active_connections[login]["sockets"].append(websocket)
    logger.info(f"[API] [+] Сокет открыт для {login}. Окон: {len(active_connections[login]['sockets'])}")

    try:
        while True:
            # Используем универсальный receive(), чтобы не падать от бинарных пингов
            await websocket.receive()
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass  # Лог будет в finally
    finally:
        # Безопасная очистка
        if login in active_connections:
            if websocket in active_connections[login]["sockets"]:
                active_connections[login]["sockets"].remove(websocket)
            if not active_connections[login]["sockets"]:
                del active_connections[login]
        logger.info(f"[API] [-] Сокет закрыт для {login}")


# --- 6. Точка запуска ---

async def run_fastapi_server(host: str, port: int):
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="warning",
        loop="asyncio"
    )
    server = uvicorn.Server(config)
    await server.serve()