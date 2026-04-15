# backend\API\api.py
import json, uvicorn, logs.LoggerWrapper as logger
from fastapi import FastAPI, WebSocket, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.websockets import WebSocketDisconnect
from backend.Services import client as active_clients
from backend.Services import send_binary_to_bot
from .config import FRONTEND_PATH
from .database import load_user_db, load_bots_from_file
from .auth_service import verify_user, register_user, get_login_by_token, generate_token
from .protocols import pack_bot_command, has_access
from .connection_manager import ConnectionManager

manager, app = ConnectionManager(), FastAPI()
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

@app.get("/")
async def root(): return RedirectResponse("/sidebar/auth/auth.html")

@app.get("/verify_token")
async def verify(token: str = None):
    return {"status": "ok", "login": login} if (login := get_login_by_token(token)) else JSONResponse(401, {"status": "err"})

@app.post("/{action}")
async def auth(action: str, data=Body(...)):
    login, password = data.get("login"), data.get("password")
    if action == "register": return {"status": "ok" if register_user(login, password) else "error"}
    if (user := verify_user(login, password)):
        return {"status": "ok", "token": generate_token(login), "role": user["role"], "prefix": user["prefix"]}
    return {"status": "error", "message": "Invalid credentials"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, login: str, mode: str = None, target: str = None):
    if not (user_login := get_login_by_token(token)) or user_login != login:
        await websocket.accept()
        return await websocket.close(1008)

    user = load_user_db().get(user_login)
    if not await manager.connect(websocket, user_login, user): return

    allowed_cache = set()
    try:
        if mode == "control" and target and has_access(user, target):
            if (bot_data := load_bots_from_file().get(target)):
                bot_data['status'] = 'online' if target in active_clients else 'offline'
                await websocket.send_bytes(pack_bot_command(target, "DataScribe", json.dumps(bot_data)))
        else: await sync_initial_state(websocket, user)

        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect": break
            if "bytes" in message and len(packet := message["bytes"]) >= 7:
                target_id = packet[6:6 + packet[0]].decode(errors='ignore').strip()
                if target_id in allowed_cache or has_access(user, target_id):
                    allowed_cache.add(target_id)
                    await send_binary_to_bot(target_id, packet)
    except (WebSocketDisconnect, RuntimeError): pass
    except Exception as error: logger.Log.error(f"[API WS] Error for {user_login}: {error}")
    finally: manager.disconnect(websocket, user_login)

async def sync_initial_state(websocket, user):
    from backend.Core.ClientConnection import preview_cache
    bots_db, visible = load_bots_from_file(), []
    for bot_id, data in bots_db.items():
        if has_access(user, bot_id):
            data['status'] = 'online' if bot_id in active_clients else 'offline'
            visible.append(data)
    
    if visible:
        await websocket.send_bytes(pack_bot_command("SYSTEM", "DataScribe", json.dumps(visible)))
        for bot_id, photo in preview_cache.items():
            if has_access(user, bot_id):
                try: await websocket.send_bytes(photo)
                except: break

async def run_fastapi_server(host, port):
    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    await uvicorn.Server(config).serve()