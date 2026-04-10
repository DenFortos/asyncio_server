# backend/Services/Auth.py

import asyncio
import json
from pathlib import Path

from logs import Log as logger
from backend import AUTH_KEY

BOTS_FILE = Path(__file__).parent / "Bots_DB.txt"
REQUIRED_FIELDS = ['id', 'loc', 'user', 'pc_name', 'active_window', 'last_active', 'ip', 'auth_key']
MAX_PAYLOAD = 65536

async def authorize_client(reader, ip_addr):
    """Первичная проверка ключа и загрузка данных бота"""
    try:
        raw_len = await asyncio.wait_for(reader.readexactly(4), 10)
        p_len = int.from_bytes(raw_len, "big")

        if not (0 < p_len <= MAX_PAYLOAD): return None

        raw_data = await asyncio.wait_for(reader.readexactly(p_len), 10)
        data = json.loads(raw_data.decode('utf-8'))
        
        bot_id = data.get('id', ip_addr)
        if not _validate_auth(data, ip_addr, bot_id): return None

        return bot_id, _sync_db(bot_id, data)
    except Exception as e:
        logger.info(f"[!] Auth Error {ip_addr}: {e}")
        return None

def sync_bot_data(bot_id, new_data):
    """Обновление метаданных бота в БД в реальном времени"""
    return _sync_db(bot_id, new_data)

def _validate_auth(data, ip, bid):
    """Проверка наличия полей и соответствия ключа"""
    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        logger.info(f"[!] Auth Fail: Missing {missing} ({ip})")
        return False
    if data.get('auth_key') != AUTH_KEY:
        logger.info(f"[!] Auth Fail: Wrong Key ({ip})")
        return False
    return True

def _sync_db(bid, payload):
    """Слияние новых данных с существующей записью в файле"""
    try:
        clean_data = {k: v for k, v in payload.items() if k != 'auth_key'}
        db = {}
        
        if BOTS_FILE.exists():
            try: db = json.loads(BOTS_FILE.read_text(encoding="utf-8"))
            except: db = {}

        if bid in db:
            # Умный мерж: не затираем валидные данные мусором
            for k, v in clean_data.items():
                if v not in [None, "", "??", "0.0.0.0", "null"]:
                    db[bid][k] = v
        else:
            db[bid] = clean_data

        BOTS_FILE.write_text(json.dumps(db, indent=4, ensure_ascii=False), encoding="utf-8")
        return db[bid]
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return payload