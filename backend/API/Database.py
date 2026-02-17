# backend/API/Database.py

import json, secrets, threading
from pathlib import Path

# --- КОНФИГУРАЦИЯ ---
BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "Database.txt"
TOKEN_FILE = BASE_DIR / "tokens.txt"
BOTS_DB_FILE = BASE_DIR.parent / "Services" / "Bots_DB.txt"

db_lock = threading.Lock()

def _access(path: Path, data: dict = None):
    """Универсальный доступ к JSON файлам."""
    with db_lock:
        try:
            if data is not None:
                path.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
                return True
            return json.loads(path.read_text(encoding="utf-8")) if path.exists() and path.stat().st_size > 0 else {}
        except Exception as e:
            print(f"[!] DB Error ({path.name}): {e}")
            return {} if data is None else False

# --- ЛОГИКА ТОКЕНОВ ---
def generate_token(login: str) -> str:
    # Загружаем, фильтруем (удаляем старые токены этого юзера) и добавляем новый
    tokens = {t: u for t, u in _access(TOKEN_FILE).items() if u != login}
    new_token = secrets.token_hex(24)
    tokens[new_token] = login
    _access(TOKEN_FILE, tokens)
    return new_token

def get_login_by_token(token: str) -> str:
    return _access(TOKEN_FILE).get(token) if token else None

# --- ЛОГИКА ПОЛЬЗОВАТЕЛЕЙ ---
def load_db() -> dict:
    db = _access(DB_FILE)
    if not db and not DB_FILE.exists():
        db = {"admin": {"password": "admin", "role": "admin", "prefix": "ALL"}}
        _access(DB_FILE, db)
    return db

def verify_user(login, password) -> dict:
    u = load_db().get(login)
    return u if u and str(u.get("password")) == str(password) else None

def register_user(login, password) -> bool:
    db = load_db()
    if login in db: return False
    db[login] = {"password": password, "role": "user", "prefix": f"u{secrets.token_hex(2)}"}
    return _access(DB_FILE, db)

# --- ЛОГИКА БОТОВ ---
def load_bots_from_file() -> dict:
    return _access(BOTS_DB_FILE)