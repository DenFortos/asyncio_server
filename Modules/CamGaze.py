from LoggerWrapper import Log as logger

def cam_gaze(data: bytes):
    logger.info(f"[CamGaze] Получен кадр с веб-камеры ({len(data)} байт)")