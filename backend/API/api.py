# backend/API/api.py
import json, uvicorn, backend.LoggerWrapper as logger
from fastapi import FastAPI, WebSocket, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from .config import FRONTEND_PATH
from .database import load_user_db, load_bots_from_file
from .auth_service import verify_user, register_user, get_login_by_token, generate_token
from .connection_manager import manager
from backend.Services import pack_packet, has_access, active_clients, preview_cache, send_binary_to_bot

app = FastAPI()
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")

@app.get("/")
async def root(): return RedirectResponse("/sidebar/auth/auth.html")

@app.get("/verify_token")
async def verify(token: str = None):
    return {"status": "ok", "login": l} if (l := get_login_by_token(token)) else JSONResponse(401, {"status": "err"})

@app.post("/{action}")
async def auth(action: str, data=Body(...)):
    l, p = data.get("login"), data.get("password")
    if action == "register": return {"status": "ok" if register_user(l, p) else "error"}
    if (u := verify_user(l, p)): return {"status": "ok", "token": generate_token(l), "role": u["role"], "prefix": u["prefix"]}
    return {"status": "error", "message": "Invalid credentials"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str, login: str, mode: str = None, target: str = None):
    if not (ul := get_login_by_token(token)) or ul != login: 
        await ws.accept(); await ws.close(1008); return
    u = load_user_db().get(ul)
    if not await manager.connect(ws, ul, u): return
    try:
        if mode == "control" and target and has_access(u, target):
            if (bd := load_bots_from_file().get(target)):
                bd.update({"status": ("online" if target in active_clients else "offline"), "id": target})
                await ws.send_bytes(pack_packet(target, "DataScribe", json.dumps(bd)))
        else: await sync_state(ws, u)
        while True:
            msg = await ws.receive()
            if msg.get("type") == "websocket.disconnect": break
            if "bytes" in msg and (p := msg["bytes"]) and len(p) >= 7:
                tid = p[6:6+p[0]].decode(errors='ignore').strip()
                if has_access(u, tid): await send_binary_to_bot(tid, p)
    except: pass
    finally: manager.disconnect(ws, ul)

async def sync_state(ws, u):
    "Синхронизация списка доступных ботов и кэша превью"
    db = load_bots_from_file()
    vis = [{**v, "status": ("online" if k in active_clients else "offline"), "id": k} for k, v in db.items() if has_access(u, k)]
    if vis: await ws.send_bytes(pack_packet("SYSTEM", "SystemInfo", json.dumps(vis, ensure_ascii=False)))
    for bid, pkt in preview_cache.items():
        if has_access(u, bid): await ws.send_bytes(pkt)

async def run_fastapi_server(host, port):
    "Запуск сервера uvicorn"
    await uvicorn.Server(uvicorn.Config(app, host=host, port=port, log_level="warning")).serve()