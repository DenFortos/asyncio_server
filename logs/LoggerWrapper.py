# logs/LoggerWrapper.py

import sys
from loguru import logger as _logger

class Log:
    @staticmethod
    def setup(log_file_path: str = "server.log"):
        """Настраивает логгер для записи в файл и консоль."""
        _logger.remove()

        # 1. Запись в файл (БЕЗ цветовых кодов, чтобы файл был чистым)
        _logger.add(
            log_file_path,
            format="{time:HH:mm:ss} | {level:8} | {message}",
            level="DEBUG",
            enqueue=True,
            colorize=False  # Файлу цвета не нужны
        )

        # 2. Вывод в консоль (через стандартный обработчик loguru)
        # Мы используем sys.stderr (стандарт для логов) вместо print
        _logger.add(
            sys.stderr,
            format="<green>{time:HH:mm:ss}</green> | <level>{level:7}</level> | {message}",
            level="INFO",
            colorize=True, # Loguru сама поймет, если терминал не поддерживает цвета
            enqueue=True
        )

    @staticmethod
    async def start_queue_listener(queue=None):
        """Больше не требуется, оставлен для совместимости интерфейса."""
        pass

    @staticmethod
    def info(msg: str):      _logger.info(msg)

    @staticmethod
    def warning(msg: str):   _logger.warning(msg)

    @staticmethod
    def error(msg: str):     _logger.error(msg)

    @staticmethod
    def debug(msg: str):     _logger.debug(msg)

    @staticmethod
    def critical(msg: str):  _logger.critical(msg)

    @staticmethod
    def exception(msg: str): _logger.exception(msg)