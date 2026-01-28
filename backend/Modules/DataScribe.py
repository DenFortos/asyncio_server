# backend/Modules/DataScribe.py
from logs import Log as logger


def data_scribe(data: dict) -> dict | None:
    """
    Получает готовый словарь от воркера.
    Логирует получение и возвращает данные обратно для отправки в API.
    """
    try:
        # Здесь можно обработать данные (записать в БД и т.д.)
        # Пока просто логируем факт получения
        client_user = data.get("user", "Unknown")
        pc_name = data.get("pc_name", "Unknown")

        logger.info(f"[DataScribe] Данные от {client_user}@{pc_name} получены.")

        # Возвращаем словарь обратно.
        # Воркер увидит, что это dict, сделает json.dumps() и отправит в API.
        return data

    except Exception as e:
        logger.error(f"[DataScribe] Ошибка обработки данных: {e}")
        return None
