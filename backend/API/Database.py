# backend\API\database.py

import json, threading
from .config import DB_FILE, TOKEN_FILE, BOTS_DB_FILE

db_lock = threading.Lock()

def _access(path, data=None):
    with db_lock:
        try:
            if data is not None:
                path.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
                return True
            return json.loads(path.read_text(encoding="utf-8")) if path.exists() and path.stat().st_size > 0 else {}
        except Exception as e:
            print(f"[!] DB Error ({path.name}): {e}"); return {} if data is None else False

load_user_db = lambda: _access(DB_FILE) or {"admin": {"password": "admin", "role": "admin", "prefix": "ALL"}}
save_user_db = lambda db: _access(DB_FILE, db)
load_tokens = lambda: _access(TOKEN_FILE)
save_tokens = lambda t: _access(TOKEN_FILE, t)
load_bots_from_file = lambda: _access(BOTS_DB_FILE)