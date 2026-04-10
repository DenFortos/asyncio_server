# backend/API/api.py

import json
import uvicorn
from fastapi import FastAPI, WebSocket, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.websockets import WebSocketDisconnect

from logs import Log as logger
from backend.Services.ClientManager import client as active_clients
from backend.Services import send_binary_to_bot
from .config import FRONTEND_PATH
from .database import load_user_db, load_bots_from_file
from .auth_service import verify_user, register_user, get_login_by_token, generate_token
from .protocols import pack_bot_command, has_access
from .connection_manager import ConnectionManager

manager = ConnectionManager()
app = FastAPI()

class APIServer:
    """Управление HTTP и WebSocket интерфейсами управления"""

    @staticmethod
    async def run(host, port):
        """Запуск сервера uvicorn"""
        config = uvicorn.Config(app, host=host, port=port, log_level="warning")
        await uvicorn.Server(config).serve()

# Настройка статики и базовых путей
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

@app.get("/")
async def root():
    return RedirectResponse("/sidebar/auth/auth.html")

@app.get("/verify_token")
async def verify(token: str = None):
    login = get_login_by_token(token)
    return {"status": "ok", "login": login} if login else JSONResponse(status_code=401, content={"status": "err"})

@app.post("/{action}")
async def auth(action: str, data=Body(...)):
    login, pwd = data.get("login"), data.get("password")
    if action == "register":
        return {"status": "ok"} if register_user(login, pwd) else {"status": "error"}
    
    user = verify_user(login, pwd)
    if user:
        return {
            "status": "ok",
            "token": generate_token(login),
            "role": user["role"],
            "prefix": user["prefix"]
        }
    return {"status": "error", "message": "Invalid credentials"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str, login: str, mode: str = None):
    """Центральный узел обмена данными между админом и ботами"""
    user_login = get_login_by_token(token)
    if not user_login or user_login != login:
        await ws.accept()
        await ws.close(code=1008)
        return

    user = load_user_db().get(user_login)
    await manager.connect(ws, user_login, user)
    allowed_bots_cache = set()

    try:
        # 1. Синхронизация списка ботов при входе
        if mode != "control":
            await _sync_initial_bots(ws, user)

        # 2. Основной цикл приема команд от фронтенда
        while True:
            msg = await ws.receive()
            if msg.get("type") == "websocket.disconnect":
                break

            if "bytes" in msg:
                pkt = msg["bytes"]
                if len(pkt) < 7: continue
                
                # Извлекаем ID цели из пакета
                target_id = pkt[6:6 + pkt[0]].decode(errors='ignore').strip()
                
                # Проверка прав доступа (Кэшированная)
                if target_id in allowed_bots_cache or has_access(user, target_id):
                    allowed_bots_cache.add(target_id)
                    await send_binary_to_bot(target_id, pkt)

    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        logger.error(f"[API WS] Error for {user_login}: {e}")
    finally:
        manager.disconnect(ws, user_login)

async def _sync_initial_bots(ws, user):
    """Сборка и отправка админу списка ботов из БД с учетом онлайн-статуса"""
    bots = load_bots_from_file()
    visible_bots = []
    
    for bid, data in bots.items():
        if has_access(user, bid):
            # Магия склейки: статус берем из RAM, данные из TXT
            data['status'] = 'online' if bid in active_clients else 'offline'
            visible_bots.append(data)
    
    if visible_bots:
        payload = pack_bot_command("SYSTEM", "DataScribe", json.dumps(visible_bots))
        await ws.send_bytes(payload)

async def run_fastapi_server(host, port):
    """Публичный метод для инициализации API"""
    await APIServer.run(host, port)