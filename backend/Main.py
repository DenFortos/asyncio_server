# backend/main.py
import asyncio
import sys
from logs import Log as logger

# ----------------------------------------------------------------------
# КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: УСТАНОВКА ПОЛИТИКИ ДО ВСЕХ ИМПОРТОВ ZMQ/ASYNCIO
# ----------------------------------------------------------------------
if sys.platform == "win32":
    try:
        # Это устранит RuntimeWarning от ZMQ и обеспечит корректную работу.
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except NotImplementedError:
        # На всякий случай, если политика недоступна (очень старые версии Python)
        pass

# ----------------------------------------------------------------------
# Основные импорты (теперь они безопасны)
# ----------------------------------------------------------------------
from backend.Core.Server import start_server
from backend.CLI.CLI import operator_interface  # (Ваш исправленный импорт)


async def main_startup():
    # --- ДОБАВЬ ЭТОТ ВЫЗОВ САМЫМ ПЕРВЫМ ---
    logger.setup(log_file_path="server.log")
    # ---------------------------------------

    try:
        # Запуск start_server, который блокирует выполнение до выхода через CLI
        await start_server()

    except Exception as e:
        logger.error(f"[!] Critical Error during startup: {e}")
    finally:
        pass


if __name__ == "__main__":

    # Запуск
    try:
        asyncio.run(main_startup())
    except KeyboardInterrupt:
        logger.info("[*] Program closed by user (Ctrl+C).")
    except asyncio.CancelledError:
        logger.info("[*] Main task cancelled.")