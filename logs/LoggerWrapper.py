from loguru import logger as _logger
from typing import Optional

class Log:
    @staticmethod
    def setup(log_file_path: str = "server.log"):
        """Настраивает логгер для записи в файл и консоль."""
        _logger.remove()

        # Запись в файл
        _logger.add(
            log_file_path,
            format="{time:HH:mm:ss} | {level:8} | {message}",
            level="DEBUG",
            enqueue=True,  # Оставляем для безопасности при записи из разных корутин
        )

        # Вывод в консоль (опционально, если хочешь видеть логи в терминале)
        _logger.add(
            lambda msg: print(msg, end=""),
            format="<green>{time:HH:mm:ss}</green> | <level>{level:8}</level> | {message}",
            level="INFO",
            colorize=True
        )

    # Старые методы очереди нам больше не нужны, но мы оставляем обертки для совместимости
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