from loguru import logger

def bin_stream(data: bytes):
    logger.info(f"[BinStream] Получен бинарный файл/папка ({len(data)} байт)")