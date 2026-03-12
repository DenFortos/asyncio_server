# backend/Services/Auth.py

import asyncio, json, time
from pathlib import Path
from logs import Log as logger
from backend import AUTH_KEY

BOTS_FILE = Path(__file__).parent / "Bots_DB.txt"
REQUIRED_FIELDS = ['id', 'loc', 'user', 'pc_name', 'activeWindow', 'last_active', 'ip', 'auth_key']
MAX_PAYLOAD = 64 * 1024

def quick_save_bot(bot_id, payload):
    """Обновляет данные бота в файловой базе."""
    try:
        db = json.loads(BOTS_FILE.read_text(encoding="utf-8")) if BOTS_FILE.exists() else {}
        db[bot_id] = payload
        BOTS_FILE.write_text(json.dumps(db, indent=4, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        logger.error(f"DB Write Error: {e}")

async def authorize_client(reader: asyncio.StreamReader, ip_address: str):
    """
    Авторизация: [4 байта длины][JSON данные].
    Возвращает (bot_id, payload_dict) или None.
    """
    bot_id = ip_address
    try:
        # 1. Получаем длину и сами данные (строго по протоколу)
        raw_len = await asyncio.wait_for(reader.readexactly(4), 10)
        payload_len = int.from_bytes(raw_len, "big")

        if not (0 < payload_len <= MAX_PAYLOAD):
            raise ValueError(f"Invalid size: {payload_len}")

        raw_data = await asyncio.wait_for(reader.readexactly(payload_len), 10)
        data = json.loads(raw_data.decode('utf-8'))
        
        # 2. Валидация полей и ключа
        bot_id = data.get('id', ip_address)
        missing = [f for f in REQUIRED_FIELDS if f not in data]
        
        if missing:
            logger.info(f"[!] Auth Fail: Missing fields {missing} from {ip_address}")
            return None

        if data.get('auth_key') != AUTH_KEY:
            logger.info(f"[!] Auth Fail: Wrong Key from {ip_address} ({bot_id})")
            return None

        # 3. Успех
        quick_save_bot(bot_id, data)
        return bot_id, data

    except (asyncio.TimeoutError, asyncio.IncompleteReadError):
        logger.info(f"[!] Auth Timeout/Incomplete from {ip_address}")
    except Exception as e:
        logger.info(f"[!] Auth Error from {ip_address} ({bot_id}): {e}")

    return None