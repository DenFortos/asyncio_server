from LoggerWrapper import Log as logger

def echo_tap(data: bytes):
    logger.info(f"[EchoTap] Получен аудиопоток ({len(data)} байт)")