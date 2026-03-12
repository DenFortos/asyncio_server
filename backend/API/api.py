# backend\API\api.py

import uvicorn, asyncio, json
from fastapi import FastAPI, WebSocket, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from contextlib import asynccontextmanager

from .config import FRONTEND_PATH
from .database import load_user_db, load_bots_from_file
from .auth_service import verify_user, register_user, get_login_by_token, generate_token
from .protocols import pack_bot_command, has_access
from .connection_manager import ConnectionManager
from backend.Services import send_binary_to_bot
from logs import Log as logger

manager = ConnectionManager()
app = FastAPI()
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

@app.get("/")
async def root(): return RedirectResponse("/sidebar/auth/auth.html")

@app.get("/verify_token")
async def verify(token: str = None):
    login = get_login_by_token(token)
    return {"status": "ok", "login": login} if login else JSONResponse(401, {"status": "err"})

@app.post("/{action}")
async def auth(action: str, data=Body(...)):
    login, pwd = data.get("login"), data.get("password")
    if action == "register":
        return {"status": "ok"} if register_user(login, pwd) else {"status": "error"}
    
    u = verify_user(login, pwd)
    if u: return {"status": "ok", "token": generate_token(login), "role": u["role"], "prefix": u["prefix"]}
    return {"status": "error", "message": "Invalid credentials"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str, login: str, mode: str = None):
    user_login = get_login_by_token(token)
    if not user_login or user_login != login:
        await ws.accept(); await ws.close(1008); return

    user = load_user_db().get(user_login)
    await manager.connect(ws, user_login, user)
    allowed_bots_cache = set()

    try:
        if mode != "control":
            bots = load_bots_from_file()
            for bid, data in bots.items():
                if has_access(user, bid):
                    await ws.send_bytes(pack_bot_command(bid, "DataScribe", json.dumps(data)))
                    asyncio.create_task(send_binary_to_bot(bid, pack_bot_command(bid, "DataScribe", "get_metadata")))
        
        while True:
            msg = await ws.receive()
            if "bytes" in msg:
                pkt = msg["bytes"]
                if len(pkt) < 7: continue
                target_id = pkt[6:6 + pkt[0]].decode(errors='ignore').strip()
                
                if target_id in allowed_bots_cache or has_access(user, target_id):
                    allowed_bots_cache.add(target_id)
                    await send_binary_to_bot(target_id, pkt)
    except Exception as e:
        logger.info(f"[WS] Closed for {user_login}: {e}")
    finally:
        manager.disconnect(ws, user_login)

async def run_fastapi_server(host, port):
    await uvicorn.Server(uvicorn.Config(app, host=host, port=port, log_level="warning")).serve()