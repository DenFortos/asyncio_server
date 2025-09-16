from loguru import logger
def data_scribe(data: bytes):
    try:
        text = data.decode("utf-8")
        logger.info(f"[DataScribe] Получены текстовые данные: {text[:50]}{'...' if len(text) > 50 else ''}")
    except UnicodeDecodeError:
        logger.info("[DataScribe] Ошибка декодирования текста")