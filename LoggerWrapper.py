# LoggerWrapper.py
from loguru import logger as _logger
import sys
from prompt_toolkit.patch_stdout import patch_stdout
import asyncio
from multiprocessing import Queue
from typing import Optional

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
            format="{time:HH:mm:ss} | {level} | {message}",
            enqueue=enqueue,
        )

    @staticmethod
    def for_worker(queue: Queue):
        """Возвращает логгер для воркера, который пишет в очередь"""
        Log._queue = queue
        return Log

    @staticmethod
    async def start_queue_listener(queue: Queue):
        """Асинхронный слушатель очереди логов от воркеров"""
        Log._queue = queue
        while True:
            msg = await asyncio.to_thread(queue.get)  # блокирующий get через поток
            if msg == "STOP":
                break
            with patch_stdout():
                print(msg, end="")

    # --- Методы логирования ---
    @staticmethod
    def info(msg, *args, **kwargs):
        if Log._queue:
            Log._queue.put(f"[INFO] {msg}\n")
        else:
            with patch_stdout():
                _logger.info(msg, *args, **kwargs)

    @staticmethod
    def warning(msg, *args, **kwargs):
        if Log._queue:
            Log._queue.put(f"[WARNING] {msg}\n")
        else:
            with patch_stdout():
                _logger.warning(msg, *args, **kwargs)

    @staticmethod
    def error(msg, *args, **kwargs):
        if Log._queue:
            Log._queue.put(f"[ERROR] {msg}\n")
        else:
            with patch_stdout():
                _logger.error(msg, *args, **kwargs)

    @staticmethod
    def debug(msg, *args, **kwargs):
        if Log._queue:
            Log._queue.put(f"[DEBUG] {msg}\n")
        else:
            with patch_stdout():
                _logger.debug(msg, *args, **kwargs)

    @staticmethod
    def critical(msg, *args, **kwargs):
        if Log._queue:
            Log._queue.put(f"[CRITICAL] {msg}\n")
        else:
            with patch_stdout():
                _logger.critical(msg, *args, **kwargs)

    @staticmethod
    def exception(msg, *args, **kwargs):
        if Log._queue:
            Log._queue.put(f"[EXCEPTION] {msg}\n")
        else:
            with patch_stdout():
                _logger.exception(msg, *args, **kwargs)