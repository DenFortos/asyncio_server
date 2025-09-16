from loguru import logger

def screen_watch(data: bytes):
    logger.info(f"[ScreenWatch] Получен кадр экрана ({len(data)} байт)")