# backend/Services/Auth.py
import asyncio, json, logs.LoggerWrapper as logger
from pathlib import Path
from backend.Core.network import read_packet

DB_FILE = Path(__file__).parent / "Bots_DB.txt"

async def authorize_bot(reader, ip):
    "Ожидание SystemInfo для регистрации бота"
    try:
        if (p := await asyncio.wait_for(read_packet(reader), 10)) and p[1] == "SystemInfo" and isinstance(p[2], dict):
            bid, data = p[0], p[2]
            if data.get('ip') in ["0.0.0.0", "127.0.0.1", None]: data['ip'] = ip
            return bid, sync_bot_data(bid, data)
    except Exception as e: logger.Log.error(f"[Auth] Protocol Error: {e}")
    return None

def get_full_db():
    "Загрузка базы данных из файла"
    try: return json.loads(DB_FILE.read_text(encoding="utf-8")) if DB_FILE.exists() and DB_FILE.stat().st_size > 0 else {}
    except: return {}

def sync_bot_data(bot_id, payload):
    "Обновление метаданных бота в БД"
    try:
        db = get_full_db()
        info = db.get(bot_id, {"id": bot_id})
        # Фильтруем пустые/технические значения и обновляем
        clean_pay = {k: v for k, v in payload.items() if v not in [None, "", "??", "Loading...", "Idle"]}
        info.update(clean_pay)
        info['status'] = 'offline' if payload.get('status') == 'offline' else 'online'
        db[bot_id] = info
        DB_FILE.write_text(json.dumps(db, ensure_ascii=False, separators=(',', ':')), encoding="utf-8")
        return info
    except Exception as e:
        logger.Log.error(f"[Auth] DB Error: {e}"); return payload