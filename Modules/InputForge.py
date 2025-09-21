from LoggerWrapper import Log as logger

def input_forge(data: bytes):
    logger.info(f"[InputForge] Получены команды ввода ({len(data)} байт)")