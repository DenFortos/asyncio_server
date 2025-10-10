# backend/Modules.py

from logs import Log as logger

def data_scribe(data: bytes) -> str | None:
    """Декодирует байты в текст и возвращает его."""
    try:
        text = data.decode("utf-8")
        logger.info(f"[DataScribe] Получены текстовые данные.")
        return text # <-- ВОЗВРАЩАЕМ ГОТОВЫЙ ТЕКСТ
    except UnicodeDecodeError:
        logger.error("[DataScribe] Ошибка декодирования текста")
        return None