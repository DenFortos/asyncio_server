# logs/LoggerWrapper.py
from loguru import logger as _logger
import asyncio
from multiprocessing import Queue
from typing import Optional

class Log:
    _queue: Optional[Queue] = None # Анотация типа _queue = multiprocessing.Queue или None

    @staticmethod
    def setup(log_file_path: str = "server.log"):
        """Настраивает логгер для записи в один файл без ротации."""
        _logger.remove()
        _logger.add(
            log_file_path,
            # Убираем rotation и retention для одного большого файла
            format="{time:HH:mm:ss} | {level:8} | {message}", # Более краткий формат
            level="DEBUG",
            enqueue=True, # Обязательно для multiprocessing и asyncio
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
            _logger.log(level.upper(), msg)

    @staticmethod
    def _log_worker(level: str, msg: str, *args, **kwargs):
        """Внутренний метод: воркер -> очередь, главный -> файл."""
        if Log._queue:
            Log._queue.put((level, msg.format(*args, **kwargs)))
        else:
            _logger.log(level.upper(), msg, *args, **kwargs)

    @staticmethod
    def info(msg, *args, **kwargs):    Log._log_worker("INFO", msg, *args, **kwargs)
    @staticmethod
    def warning(msg, *args, **kwargs): Log._log_worker("WARNING", msg, *args, **kwargs)
    @staticmethod
    def error(msg, *args, **kwargs):   Log._log_worker("ERROR", msg, *args, **kwargs)
    @staticmethod
    def debug(msg, *args, **kwargs):   Log._log_worker("DEBUG", msg, *args, **kwargs)
    @staticmethod
    def critical(msg, *args, **kwargs): Log._log_worker("CRITICAL", msg, *args, **kwargs)
    @staticmethod
    def exception(msg, *args, **kwargs): Log._log_worker("EXCEPTION", msg, *args, **kwargs)
