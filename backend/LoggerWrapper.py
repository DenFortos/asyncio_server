# backend/LoggerWrapper.py

import sys
import os
from loguru import logger as internal_logger

internal_logger.remove()


class Log:
    """
    Класс-обертка над библиотекой loguru для централизованного управления логами.
    
    Схема вывода:
    - Консоль (stdout): уровень INFO, цветной формат.
    - Файл (server.log): уровень DEBUG, ротация 10 МБ.
    """

    @staticmethod
    def setup(log_file_path: str) -> None:
        """
        Инициализация конфигурации логгера.
        
        Создает директории, если они отсутствуют, и устанавливает обработчики
        для консольного и файлового вывода.
        """
        internal_logger.remove()

        log_directory: str = os.path.dirname(log_file_path)
        if log_directory and not os.path.exists(log_directory):
            os.makedirs(log_directory, exist_ok=True)

        internal_logger.add(
            log_file_path,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level:8} | {message}",
            level="DEBUG",
            enqueue=True,
            rotation="10 MB"
        )

        internal_logger.add(
            sys.stderr,
            format="<green>{time:HH:mm:ss}</green> | <level>{level:7}</level> | {message}",
            level="INFO",
            enqueue=True
        )

    @staticmethod
    def info(message: str) -> None:
        """Запись информационного сообщения."""
        internal_logger.info(message)

    @staticmethod
    def warning(message: str) -> None:
        """Запись предупреждения."""
        internal_logger.warning(message)

    @staticmethod
    def error(message: str) -> None:
        """Запись ошибки."""
        internal_logger.error(message)

    @staticmethod
    def debug(message: str) -> None:
        """Запись отладочной информации."""
        internal_logger.debug(message)

    @staticmethod
    def critical(message: str) -> None:
        """Запись критической ошибки."""
        internal_logger.critical(message)

    @staticmethod
    def exception(message: str) -> None:
        """Запись ошибки с дампом стека вызовов."""
        internal_logger.exception(message)