# logs.py (ИСПРАВЛЕННАЯ ВЕРСИЯ)
from loguru import logger as _logger
import sys
from prompt_toolkit.patch_stdout import patch_stdout
import asyncio
from multiprocessing import Queue
from typing import Optional
from datetime import datetime # datetime больше не нужен для форматирования

class Log:
    """Универсальный логгер для всего проекта с поддержкой CLI и логов воркеров"""

    _queue: Optional[Queue] = None  # очередь для логов воркеров

    @staticmethod
    def setup(sink=sys.stdout, colorize=True, enqueue=True):
        """Настройка логгера для главного процесса"""
        _logger.remove()
        _logger.add(
            sink,
            colorize=colorize,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | {message}",
            enqueue=enqueue,
        )

    @staticmethod
    def for_worker(queue: Queue):
        """Возвращает логгер для воркера, который пишет в очередь"""
        Log._queue = queue
        return Log

    @staticmethod
    async def start_queue_listener(queue: Queue, websocket_handler=None):
        """Асинхронный слушатель очереди логов от воркеров"""
        while True:
            # Блокирующий get через поток. Теперь принимает кортеж (уровень, сообщение)
            level, msg = await asyncio.to_thread(queue.get)
            if msg == "STOP":
                break

            # Отправляем в WebSocket (если передан обработчик)
            if websocket_handler:
                # Отправка лога в WebSocket должна быть отдельной задачей
                await websocket_handler.send_log(msg.strip())

            # ВАЖНО: Выводим через Loguru, чтобы он сам обрабатывал форматирование и patch_stdout
            with patch_stdout():
                _logger.log(level.upper(), msg)

    # --- Методы логирования ---
    # Мы отправляем в очередь кортеж (уровень, сообщение)
    @staticmethod
    def _log_worker(level, msg, *args, **kwargs):
        """Внутренний метод для логирования из воркера или главного процесса"""
        if Log._queue:
            # Логирование из воркера: отправляем в очередь
            Log._queue.put((level, msg.format(*args, **kwargs)))
        else:
             # Логирование из главного процесса: ВАЖНО - используем patch_stdout!
             # Это гарантирует, что даже стартовые логи (если CLI уже запущен)
             # будут перерисованы корректно.
             with patch_stdout():
                _logger.log(level.upper(), msg, *args, **kwargs)

    @staticmethod
    def info(msg, *args, **kwargs):
        Log._log_worker("INFO", msg, *args, **kwargs)

    @staticmethod
    def warning(msg, *args, **kwargs):
        Log._log_worker("WARNING", msg, *args, **kwargs)

    @staticmethod
    def error(msg, *args, **kwargs):
        Log._log_worker("ERROR", msg, *args, **kwargs)

    @staticmethod
    def debug(msg, *args, **kwargs):
        Log._log_worker("DEBUG", msg, *args, **kwargs)

    @staticmethod
    def critical(msg, *args, **kwargs):
        Log._log_worker("CRITICAL", msg, *args, **kwargs)

    @staticmethod
    def exception(msg, *args, **kwargs):
        Log._log_worker("EXCEPTION", msg, *args, **kwargs)