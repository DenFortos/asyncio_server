from loguru import logger

def echo_tap(data: bytes):
    logger.info(f"[EchoTap] Получен аудиопоток ({len(data)} байт)")