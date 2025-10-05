from logs import Log as logger

def bin_stream(data: bytes):
    logger.info(f"[BinStream] Получен бинарный файл/папка ({len(data)} байт)")