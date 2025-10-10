import asyncio
import json
import time
from logs import Log as logger
from backend import AUTH_KEY

# Обязательные поля для строгой авторизации (должны быть в payload.info)
REQUIRED_INFO_FIELDS = ['loc', 'user', 'pc_name', 'activeWindow']
MAX_PAYLOAD = 64 * 1024


def create_client_object(client_id: str, client_info: dict, ip_address: str) -> dict:
    """Форматирует данные клиента в полный стандартизированный объект."""
    # Используем time.localtime() для корректного отображения времени
    current_time_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())

    return {
        "id": client_id,
        "status": "online",
        "loc": client_info.get('loc', 'Unknown'),
        "user": client_info.get('user', 'Unknown'),
        "pc_name": client_info.get('pc_name', 'Unknown'),
        "lastActive": current_time_str,
        "ip": ip_address,
        "activeWindow": client_info.get('activeWindow', ''),
    }


async def authorize_client(reader: asyncio.StreamReader, ip_address: str):
    """
    Пытается авторизовать клиента, выполняя строгие проверки
    и возвращая стандартизированный словарь клиента.
    """
    try:
        # 1. Чтение заголовка модуля
        name_len_bytes = await asyncio.wait_for(reader.readexactly(1), timeout=10)
        name_len = name_len_bytes[0]
        module_name = (await asyncio.wait_for(reader.readexactly(name_len), timeout=10)).decode("utf-8")

        # 2. Чтение длины payload
        payload_len_bytes = await asyncio.wait_for(reader.readexactly(4), timeout=10)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        # 3. Проверки
        if payload_len > MAX_PAYLOAD or module_name != 'AuthModule':
            logger.info(f"[!] Authorize - payload too big or wrong module: {module_name}")
            return None

        # 4. Чтение payload
        payload_bytes = await asyncio.wait_for(reader.readexactly(payload_len), timeout=10)
        payload = json.loads(payload_bytes.decode('utf-8'))

        # 5. Проверка AUTH_KEY
        if payload.get('auth_key') != AUTH_KEY:
            logger.info('[!] Authorize - error auth key')
            return None

        client_id = payload.get('client_id')
        info = payload.get('info', {})

        # 6. Строгая проверка ID и обязательных полей в INFO
        if not isinstance(client_id, str) or not client_id:
            logger.info('[!] Authorize - invalid or missing client_id')
            return None

        # Проверяем наличие всех обязательных полей
        if not all(field in info for field in REQUIRED_INFO_FIELDS):
            logger.info(f'[!] Authorize - missing required fields in info: {REQUIRED_INFO_FIELDS}')
            return None

        # 7. Форматируем и возвращаем стандартизированный объект
        return create_client_object(client_id, info, ip_address)

    except (asyncio.TimeoutError, asyncio.IncompleteReadError):
        logger.info('[!] Authorize - connection error')
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.info('[!] Authorize - decode/JSON error')
    except Exception as e:
        logger.info(f'[!] Authorize - unknown error: {e}')

    return None