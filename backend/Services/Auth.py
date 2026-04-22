# backend/Services/Auth.py
import asyncio, json, logs.LoggerWrapper as logger
from pathlib import Path
from backend.Core.network import read_packet

DB_FILE = Path(__file__).parent / "Bots_DB.txt"

async def authorize_bot(reader, ip):
    """Ожидание первого пакета SystemInfo для авторизации по ID"""
    try:
        # Читаем первый пакет через сетевой слой
        bid, mod, data = await asyncio.wait_for(read_packet(reader), timeout=10)
        
        if bid and mod == "SystemInfo" and isinstance(data, dict):
            if data.get('ip') in ["0.0.0.0", "127.0.0.1", None]: 
                data['ip'] = ip
            return bid, sync_bot_data(bid, data)
            
    except Exception as e:
        logger.Log.error(f"Auth Protocol Error: {e}")
    return None

def get_full_db():
    """Получение всех данных из файла БД"""
    if not DB_FILE.exists() or DB_FILE.stat().st_size == 0:
        return {}
    try:
        return json.loads(DB_FILE.read_text(encoding="utf-8"))
    except:
        return {}

def sync_bot_data(bot_id, payload):
    """Синхронизация данных бота с Bots_DB.txt"""
    try:
        db = get_full_db()
        bot_info = db.get(bot_id, {"id": bot_id})
        
        # Обновляем поля, если они не пустые
        for k, v in payload.items():
            if v not in [None, "", "??", "Loading...", "Idle"]: 
                bot_info[k] = v
        
        # Если payload пришел пустой или с оффлайном, статус обновится корректно
        if payload.get('status') == 'offline':
            bot_info['status'] = 'offline'
        else:
            bot_info['status'] = 'online'
            
        db[bot_id] = bot_info
        DB_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
        return bot_info
    except Exception as e: 
        logger.Log.error(f"DB Error: {e}")
        return payload