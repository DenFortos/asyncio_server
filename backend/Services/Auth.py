# backend/Services/Auth.py
import asyncio, json, backend.LoggerWrapper as logger
from pathlib import Path
from .network import read_packet

DB_FILE = Path(__file__).parent / "Bots_DB.txt"

async def authorize_bot(reader, ip):
    "Авторизация бота через SystemInfo"
    try:
        while True:
            if not (p := await asyncio.wait_for(read_packet(reader), 10))[0]: return None
            bid, mod, data = p
            if mod == "SystemInfo" and isinstance(data, dict):
                if data.get('ip') in ["0.0.0.0", "127.0.0.1", None]: data['ip'] = ip
                return bid, sync_bot_data(bid, data)
            logger.Log.info(f"[Auth] Skip early: {mod} from {ip}")
    except Exception as e: logger.Log.error(f"[Auth] Protocol Err: {e}")
    return None

def get_full_db():
    "Загрузка БД"
    try: return json.loads(DB_FILE.read_text(encoding="utf-8")) if DB_FILE.exists() and DB_FILE.stat().st_size > 0 else {}
    except: return {}

def sync_bot_data(bid, pay):
    "Синхронизация данных бота с вертикальной записью JSON"
    try:
        db, info = get_full_db(), get_full_db().get(bid, {"id": bid})
        clean = {k: v for k, v in pay.items() if v not in [None, "", "??", "Loading...", "Idle"]}
        info.update(clean)
        info['status'] = 'offline' if pay.get('status') == 'offline' else 'online'
        db[bid] = info
        DB_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=4), encoding="utf-8")
        return info
    except Exception as e: logger.Log.error(f"[Auth] DB Err: {e}"); return pay