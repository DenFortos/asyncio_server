# backend/Auth.py

import asyncio
import json
import time
from logs import Log as logger
# Предполагаем, что AUTH_KEY импортирован корректно
from backend import AUTH_KEY

# ⚡️ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ: Теперь ожидаем, что клиент сам пришлет готовый, полный объект
# с ID, статусом, IP, временем и метаданными.
# Сервер только проверяет их наличие.
REQUIRED_INFO_FIELDS = ['id', 'status', 'loc', 'user', 'pc_name', 'activeWindow', 'last_active', 'ip']
MAX_PAYLOAD = 64 * 1024  # 64 KB


async def authorize_client(reader: asyncio.StreamReader, ip_address: str):
    """
    Пытается авторизовать клиента по TCP-потоку.
    Сервер только проверяет ключи и обязательные поля.
    Возвращает кортеж (client_id, original_payload_bytes) или None.

    Ожидаемый формат: [ID_len][ID][Module_len][Module_name][Payload_len][Payload JSON Bytes]
    """

    READ_TIMEOUT = 10
    client_id = "?"  # ID для логирования в случае ранней ошибки

    try:
        # 1. Чтение заголовка ID клиента
        id_len_bytes = await asyncio.wait_for(reader.readexactly(1), timeout=READ_TIMEOUT)
        id_len = id_len_bytes[0]
        client_id = (await asyncio.wait_for(reader.readexactly(id_len), timeout=READ_TIMEOUT)).decode("utf-8")

        # 2. Чтение заголовка модуля
        name_len_bytes = await asyncio.wait_for(reader.readexactly(1), timeout=READ_TIMEOUT)
        name_len = name_len_bytes[0]
        module_name = (await asyncio.wait_for(reader.readexactly(name_len), timeout=READ_TIMEOUT)).decode("utf-8")

        # 3. Чтение длины payload
        payload_len_bytes = await asyncio.wait_for(reader.readexactly(4), timeout=READ_TIMEOUT)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        # 4. Проверки модуля и размера
        if module_name != 'AuthModule':
            logger.info(f"[!] Auth - wrong module: {module_name} for ID {client_id}")
            return None

        if payload_len <= 0 or payload_len > MAX_PAYLOAD:
            logger.info(f"[!] Auth - invalid payload size: {payload_len} bytes for ID {client_id}")
            return None

        # 5. Чтение payload (сохраняем оригинальные байты)
        original_payload_bytes = await asyncio.wait_for(reader.readexactly(payload_len), timeout=READ_TIMEOUT)

        # 6. Проверка ключа и обязательных полей (требуется декодирование)
        payload_dict = json.loads(original_payload_bytes.decode('utf-8'))

        if payload_dict.get('auth_key') != AUTH_KEY:
            logger.info(f'[!] Auth - error auth key for ID {client_id}')
            return None

        # Проверка обязательных полей (клиент должен прислать полный объект)
        if not all(field in payload_dict for field in REQUIRED_INFO_FIELDS):
            logger.info(f'[!] Auth - missing required fields: {REQUIRED_INFO_FIELDS} for ID {client_id}')
            return None

        # Проверка согласованности ID
        if client_id != payload_dict.get('id'):
            logger.warning(f"[!] Auth - ID mismatch: Header ID='{client_id}', Payload ID='{payload_dict.get('id')}'")
            return None

        # 7. Возвращаем ID из заголовка и оригинальные БАЙТЫ Payload
        return client_id, original_payload_bytes

    except (asyncio.TimeoutError, asyncio.IncompleteReadError):
        logger.info(f'[!] Auth - connection timed out or incomplete read for ID {client_id}')
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.info(f'[!] Auth - decode/JSON error during payload processing for ID {client_id}')
    except Exception as e:
        logger.info(f'[!] Auth - unknown error for ID {client_id}: {type(e).__name__}: {e}')

    return None