# backend/API/database.py
import json, threading
from .config import DB_FILE, TOKEN_FILE, BOTS_DB_FILE

db_lock = threading.Lock()

def _io(path, data=None):
    "Универсальный потокобезопасный ввод-вывод для JSON"
    with db_lock:
        try:
            if data is not None: return path.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8") or True
            return json.loads(path.read_text(encoding="utf-8")) if path.exists() and path.stat().st_size > 0 else {}
        except: return {} if data is None else False

load_user_db = lambda: _io(DB_FILE) or {"admin": {"password": "admin", "role": "admin", "prefix": "ALL"}}
save_user_db = lambda db: _io(DB_FILE, db)
load_tokens = lambda: _io(TOKEN_FILE)
save_tokens = lambda tokens: _io(TOKEN_FILE, tokens)
load_bots_from_file = lambda: _io(BOTS_DB_FILE)