# logs/LoggerWrapper.py
from loguru import logger as _logger
import asyncio
from multiprocessing import Queue
from typing import Optional

class Log:
    _queue: Optional[Queue] = None

    @staticmethod
    def setup(log_file_path: str = "server.log"):
        """Настраивает логгер для записи в один файл без ротации."""
        _logger.remove()
        _logger.add(
            log_file_path,
            format="{time:HH:mm:ss} | {level:8} | {message}",
            level="DEBUG",
            enqueue=True,
        )

    @staticmethod
    def for_worker(queue: Queue):
        """Говорит воркеру писать в очередь."""
        Log._queue = queue

    @staticmethod
    async def start_queue_listener(queue: Queue):
        """Слушает очередь от воркеров и пишет в файл."""
        while True:
            level, msg = await asyncio.to_thread(queue.get)
            if msg == "STOP":
                break
            _logger.log(level.upper(), msg)  # msg уже готовая строка

    @staticmethod
    def _log_worker(level: str, msg: str):
        """Внутренний метод: воркер -> очередь, главный -> файл."""
        if Log._queue:
            Log._queue.put((level, msg))  # msg уже готовая строка
        else:
            _logger.log(level.upper(), msg)

    @staticmethod
    def info(msg: str):      Log._log_worker("INFO", msg)
    @staticmethod
    def warning(msg: str):   Log._log_worker("WARNING", msg)
    @staticmethod
    def error(msg: str):     Log._log_worker("ERROR", msg)
    @staticmethod
    def debug(msg: str):     Log._log_worker("DEBUG", msg)
    @staticmethod
    def critical(msg: str):  Log._log_worker("CRITICAL", msg)
    @staticmethod
    def exception(msg: str): Log._log_worker("EXCEPTION", msg)