# backend/API/connection_manager.py

import asyncio
from typing import Any, Dict, List, Optional, Tuple
import backend.LoggerWrapper as logger
from backend.Services.network import NetworkProtocol

class ConnectionManager:
    """
    Маршрутизатор бинарных пакетов V8.0 между ботами и WebSocket-клиентами.
    Поддерживает RBAC (роли и префиксы), троттлинг тяжелого трафика и лимит сессий.
    """

    def __init__(self) -> None:
        # Храним данные пользователя для каждого сокета: {WebSocket: {"login": str, "role": str, "prefix": str}}
        self.active_sessions: Dict[Any, Dict[str, Any]] = {}
        # Очереди и задачи на отправку
        self.queues: Dict[Any, asyncio.Queue] = {}
        self.send_tasks: Dict[Any, asyncio.Task] = {}
        # Счётчик окон для лимита (3 на логин)
        self.login_counts: Dict[str, int] = {}

    async def connect(self, websocket: Any, login: str, user_data: Dict[str, Any]) -> bool:
        """Регистрация новой сессии админа с проверкой лимита окон."""
        # Проверка лимита: максимум 3 окна
        current_count = self.login_counts.get(login, 0)
        if current_count >= 3:
            logger.Log.warning(f"[API] Denied connection for {login}: session limit reached (3)")
            await websocket.close(code=1008)
            return False

        await websocket.accept()
        
        # Настройка инфраструктуры отправки
        outgoing_queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self.queues[websocket] = outgoing_queue
        self.send_tasks[websocket] = asyncio.create_task(self._writer(websocket, outgoing_queue))
        
        # Сохраняем данные сессии
        self.active_sessions[websocket] = {
            "login": login,
            "role": user_data.get("role", "user"),
            "prefix": user_data.get("prefix", "NONE")
        }
        self.login_counts[login] = current_count + 1

        logger.Log.info(f"[API] [+] Session started: {login} (Role: {user_data.get('role')})")
        return True

    def broadcast_packet_sync(self, packet: bytes) -> None:
        """
        Разбор заголовка V8.0 и интеллектуальная рассылка пакета целевым админам.
        Оптимизировано для сквозного проброса ScreenView.
        """
        if len(packet) < 8:
            return

        try:
            # Извлекаем длины сегментов напрямую из байт
            id_len = packet[0]
            mod_body_len = int.from_bytes(packet[1:3], "big")
            
            # Извлекаем ID для проверки доступа
            bot_id_raw = packet[8 : 8 + id_len]
            bot_id = bot_id_raw.decode(errors="ignore").strip('\x00').strip()
            
            # Извлекаем метаданные (модуль/команда) для определения типа трафика
            # Это необходимо для работы троттлинга (очистки очереди при лагах)
            meta_slice = packet[8 + id_len : 8 + id_len + mod_body_len].decode(errors="ignore")
            
            # Проверка на медиа-контент: ScreenView пролетает здесь
            is_heavy = any(tag in meta_slice for tag in ["Preview", "ScreenView", "Screen", "Camera", "Frame"])

            sent_count = 0
            for websocket, user_info in self.active_sessions.items():
                # Централизованная проверка доступа
                if bot_id == "SERVER" or NetworkProtocol.has_access(user_info, bot_id):
                    self._push_to_queue(websocket, packet, is_heavy)
                    sent_count += 1
            
            if is_heavy and sent_count == 0:
                 logger.Log.warning(f"[MGR] Heavy packet (ScreenView/Preview) from {bot_id} dropped: no active admins")

        except Exception as e:
            logger.Log.error(f"[MGR] Packet parse error during broadcast: {e}")

    def _push_to_queue(self, websocket: Any, packet: bytes, is_heavy: bool) -> None:
        """Добавление пакета в очередь конкретного сокета с троттлингом для видеопотока."""
        queue = self.queues.get(websocket)
        if not queue:
            return

        # Если стрим (ScreenView) забивает канал, выкидываем старые кадры пачкой
        if is_heavy and queue.full():
            try:
                # Выкидываем до 20 старых пакетов, чтобы освободить место под свежий кадр
                for _ in range(20):
                    if not queue.empty():
                        queue.get_nowait()
                        queue.task_done()
            except Exception:
                pass

        try:
            queue.put_nowait(packet)
        except asyncio.QueueFull:
            # Если даже после очистки очередь полна (очень медленный клиент)
            pass

    async def _writer(self, websocket: Any, queue: asyncio.Queue) -> None:
        """Асинхронный воркер для выгрузки очереди в WebSocket."""
        try:
            while True:
                packet_to_send = await queue.get()
                await websocket.send_bytes(packet_to_send)
                queue.task_done()
        except Exception:
            pass 

    def disconnect(self, websocket: Any) -> None:
        """Полная очистка ресурсов при закрытии сессии."""
        if websocket in self.active_sessions:
            session = self.active_sessions.pop(websocket)
            login = session["login"]
            
            # Уменьшаем счетчик окон
            if login in self.login_counts:
                self.login_counts[login] -= 1
                if self.login_counts[login] <= 0:
                    self.login_counts.pop(login)

            # Останавливаем воркер
            if (task := self.send_tasks.pop(websocket, None)):
                task.cancel()
            
            self.queues.pop(websocket, None)
            logger.Log.info(f"[API] [-] Session closed: {login}")

manager: ConnectionManager = ConnectionManager()