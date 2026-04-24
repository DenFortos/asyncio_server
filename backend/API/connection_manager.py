# backend/API/connection_manager.py
import asyncio, backend.LoggerWrapper as logger

class ConnectionManager:
    "Управление WebSocket-туннелями и маршрутизацией пакетов"
    def __init__(self):
        self.active_users, self.tunnels = {}, {}
        self.queues, self.send_tasks = {}, {}

    async def connect(self, ws, login, user):
        "Регистрация нового соединения с проверкой лимита сессий"
        await ws.accept()
        if len(self.active_users.get(login, [])) >= 3: return await ws.close(1008) or False
        self.queues[ws] = (q := asyncio.Queue(maxsize=200))
        self.send_tasks[ws] = asyncio.create_task(self._writer(ws, q))
        self.active_users.setdefault(login, []).append(ws)
        pfx = user.get("prefix", "NONE")
        for g in ([pfx, "ALL"] if user.get("role") == "admin" else [pfx]): self.tunnels.setdefault(g, []).append(ws)
        logger.Log.info(f"[API] [+] {login} connected to {pfx}"); return True

    def broadcast_packet_sync(self, pkt):
        "Маршрутизация пакета от бота к админам по префиксам"
        if len(pkt) < 7: return
        id_l, mod_l = pkt[0], pkt[1]
        bid, mod = pkt[6:6+id_l].decode(errors='ignore'), pkt[6+id_l:6+id_l+mod_l]
        pfx = bid.split('-')[0] if '-' in bid else "NONE"
        targets = set(self.tunnels.get(pfx, [])) | set(self.tunnels.get("ALL", []))
        for ws in targets:
            if not (q := self.queues.get(ws)): continue
            if (b"Screen" in mod or b"Preview" in mod) and q.full(): [q.get_nowait() for _ in range(10) if not q.empty()]
            try: q.put_nowait(pkt)
            except: pass

    async def _writer(self, ws, q):
        "Фоновая отправка данных"
        try:
            while True: await ws.send_bytes(await q.get())
        except: pass

    def disconnect(self, ws, login):
        "Очистка ресурсов сессии"
        if (t := self.send_tasks.pop(ws, None)): t.cancel()
        self.queues.pop(ws, None)
        for group in list(self.active_users.values()) + list(self.tunnels.values()):
            if ws in group: group.remove(ws)
        logger.Log.info(f"[API] [-] {login} disconnected")

manager = ConnectionManager()