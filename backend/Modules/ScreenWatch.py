from logs import Log as logger


def screen_watch(data: bytes):
    """
    Простой проброс (Pass-through) бинарных данных.
    Принимает кадр от бота и возвращает его воркеру для отправки на фронтенд.
    """
    if not data:
        return None

    # logger.debug(f"[ScreenWatch] Реле кадра: {len(data)} байт")
    return data  # ЭТОТ RETURN КРИТИЧЕСКИ ВАЖЕН