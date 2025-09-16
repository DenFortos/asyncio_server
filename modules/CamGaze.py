from loguru import logger

def cam_gaze(data: bytes):
    logger.info(f"[CamGaze] Получен кадр с веб-камеры ({len(data)} байт)")