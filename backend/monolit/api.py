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


# backend\API\auth_service.py

import secrets
from .database import load_user_db, save_user_db, load_tokens, save_tokens

def generate_token(login: str) -> str:
    tokens = {t: u for t, u in load_tokens().items() if u != login}
    new_token = secrets.token_hex(24)
    tokens[new_token] = login
    save_tokens(tokens)
    return new_token

def get_login_by_token(token: str) -> str:
    return load_tokens().get(token) if token else None

def verify_user(login, password) -> dict:
    u = load_user_db().get(login)
    return u if u and str(u.get("password")) == str(password) else None

def register_user(login, password) -> bool:
    db = load_user_db()
    if login in db: return False
    db[login] = {"password": password, "role": "user", "prefix": f"u{secrets.token_hex(2)}"}
    return save_user_db(db)


# backend\API\config.py

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent.parent

# Пути к файлам данных
DB_FILE = BASE_DIR / "Database.txt"
TOKEN_FILE = BASE_DIR / "tokens.txt"
BOTS_DB_FILE = BASE_DIR.parent / "Services" / "Bots_DB.txt"

# Путь к фронтенду
FRONTEND_PATH = ROOT_DIR / "frontend"


# backend\API\connection_manager.py

import asyncio
from logs import Log as logger

class ConnectionManager:
    def __init__(self):
        self.active_connections = {} # {login: [ws]}
        self.tunnels = {}           # {prefix: [ws]}
        self.queues = {}            # {ws: Queue}
        self.send_tasks = {}
        self.bot_prefix_cache = {}  # {raw_id_bytes: prefix_str}

    async def connect(self, ws, login, user):
        await ws.accept()
        queue = asyncio.Queue(maxsize=100)
        self.queues[ws] = queue
        self.send_tasks[ws] = asyncio.create_task(self._socket_writer(ws, queue))
        
        self.active_connections.setdefault(login, []).append(ws)
        prefix = user.get("prefix", "NONE")
        self.tunnels.setdefault(prefix, []).append(ws)
        if user.get("role") == "admin":
            self.tunnels.setdefault("ALL", []).append(ws)
        logger.info(f"[API] [+] {login} туннелирован ({prefix})")

    async def _socket_writer(self, ws, queue):
        try:
            while True:
                packet = await queue.get()
                await ws.send_bytes(packet)
                queue.task_done()
        except: pass

    def disconnect(self, ws, login):
        if ws in self.send_tasks: self.send_tasks[ws].cancel(); del self.send_tasks[ws]
        self.queues.pop(ws, None)
        for group in [self.active_connections.get(login, []), *self.tunnels.values()]:
            if ws in group: group.remove(ws)

    def broadcast_packet_sync(self, packet: bytes):
        try:
            id_len, mod_len = packet[0], packet[1]
            raw_id = packet[6:6 + id_len]
            
            # Проверка на видео без полного декода строки
            is_video = b"ScreenWatch" in packet[6+id_len : 6+id_len+mod_len]

            # Кэширование префикса
            prefix = self.bot_prefix_cache.get(raw_id)
            if not prefix:
                prefix = raw_id.decode(errors='ignore').split('-')[0]
                self.bot_prefix_cache[raw_id] = prefix

            # Сбор уникальных получателей
            targets = set(self.tunnels.get(prefix, [])) | set(self.tunnels.get("ALL", []))

            for ws in targets:
                q = self.queues.get(ws)
                if not q: continue
                if is_video: # Очистка очереди для минимизации задержки видео
                    while not q.empty():
                        try: q.get_nowait()
                        except asyncio.QueueEmpty: break
                q.put_nowait(packet)
        except: pass


# backend\API\database.py

import json, threading
from .config import DB_FILE, TOKEN_FILE, BOTS_DB_FILE

db_lock = threading.Lock()

def _access(path, data=None):
    with db_lock:
        try:
            if data is not None:
                path.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
                return True
            return json.loads(path.read_text(encoding="utf-8")) if path.exists() and path.stat().st_size > 0 else {}
        except Exception as e:
            print(f"[!] DB Error ({path.name}): {e}"); return {} if data is None else False

load_user_db = lambda: _access(DB_FILE) or {"admin": {"password": "admin", "role": "admin", "prefix": "ALL"}}
save_user_db = lambda db: _access(DB_FILE, db)
load_tokens = lambda: _access(TOKEN_FILE)
save_tokens = lambda t: _access(TOKEN_FILE, t)
load_bots_from_file = lambda: _access(BOTS_DB_FILE)


# backend\API\protocols.py

def pack_bot_command(bot_id: str, mod: str, payload: str):
    """Универсальная упаковка: [ID_LEN][MOD_LEN][PAY_LEN(4)][DATA]"""
    b_id = bot_id.encode('utf-8')
    b_mod = mod.encode('utf-8')
    b_pay = payload.encode('utf-8')

    header = (
        len(b_id).to_bytes(1, 'big') +
        len(b_mod).to_bytes(1, 'big') +
        len(b_pay).to_bytes(4, 'big')
    )
    return header + b_id + b_mod + b_pay

def has_access(user, target_id):
    """Проверка прав доступа к боту."""
    if not user: return False
    return user["role"] == "admin" or user["prefix"] == "ALL" or target_id.startswith(user["prefix"])