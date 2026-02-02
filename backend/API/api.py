import uvicorn, asyncio, logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from .Database import verify_user, register_user, load_db
from .ZmqDispatcher import zmq_pull_task_loop
from backend import ZMQ_WORKER_PUSH_API
from backend.Services import send_binary_to_bot  # Важный импорт для команд
from logs import Log as logger


class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, ws, login, user_info):
        await ws.accept()
        self.active_connections.setdefault(login, {
            "sockets": [], "role": user_info["role"], "prefix": user_info["prefix"]
        })["sockets"].append(ws)
        logger.info(f"[API] [+] {login} (Active: {len(self.active_connections[login]['sockets'])})")

    def disconnect(self, ws, login):
        if login in self.active_connections:
            if ws in self.active_connections[login]["sockets"]:
                self.active_connections[login]["sockets"].remove(ws)
            if not self.active_connections[login]["sockets"]:
                del self.active_connections[login]
        logger.info(f"[API] [-] {login}")


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    zmq_task = asyncio.create_task(zmq_pull_task_loop(manager.active_connections, ZMQ_WORKER_PUSH_API))
    yield
    zmq_task.cancel()
    await asyncio.gather(zmq_task, return_exceptions=True)


app = FastAPI(lifespan=lifespan)
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
app.mount("/ui", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


@app.get("/")
async def root(): return RedirectResponse("/ui/auth/auth.html")


@app.post("/register")
async def api_register(data=Body(...)):
    return {"status": "ok"} if register_user(data.get("login"), data.get("password")) else {"status": "error"}


@app.post("/login")
async def api_login(data=Body(...)):
    u = verify_user(data.get("login"), data.get("password"))
    return {"status": "ok", **u} if u else {"status": "error"}


@app.get("/api/logs")
async def get_server_logs(limit: int = 150):
    f = Path("server.log")
    return {"logs": [l.strip() for l in f.read_text(encoding="utf-8").splitlines()[-limit:]]} if f.exists() else {
        "logs": []}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, login: str = Query(None)):
    user = load_db().get(login) if login else None
    if not user: return await ws.close(1008)

    await manager.connect(ws, login, user)
    prefix = user["prefix"]

    try:
        while True:
            msg = await ws.receive()
            if msg.get("type") == "websocket.disconnect": break

            # Универсальный проброс команд [ID_len][ID]...
            if "bytes" in msg:
                pkt = msg["bytes"]
                target_id = pkt[1:1 + pkt[0]].decode(errors='ignore')
                if prefix == "ALL" or target_id.startswith(prefix):
                    await send_binary_to_bot(target_id, pkt)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        manager.disconnect(ws, login)


async def run_fastapi_server(host, port):
    await uvicorn.Server(uvicorn.Config(app, host=host, port=port, log_level="warning")).serve()