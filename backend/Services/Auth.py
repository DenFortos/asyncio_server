# backend/Services/Auth.py
import asyncio, json, logs.LoggerWrapper as logger
from pathlib import Path
from backend.Core.network import read_packet

DB_FILE = Path(__file__).parent / "Bots_DB.txt"

async def authorize_bot(reader, ip):
    "Ожидание SystemInfo для регистрации бота с пропуском лишних пакетов"
    try:
        # Даем боту 10 секунд на то, чтобы он прислал хоть что-то
        while True:
            p = await asyncio.wait_for(read_packet(reader), 10)
            if not p[0]: return None # Соединение разорвано
            
            bid, mod, data = p
            
            if mod == "SystemInfo" and isinstance(data, dict):
                if data.get('ip') in ["0.0.0.0", "127.0.0.1", None]: 
                    data['ip'] = ip
                return bid, sync_bot_data(bid, data)
            
            # Если пришел Heartbeat или Preview до авторизации - просто игнорируем и ждем SystemInfo
            logger.Log.info(f"[Auth] Skip early packet: {mod} from {ip}")
            
    except Exception as e: 
        logger.Log.error(f"[Auth] Protocol Error: {e}")
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