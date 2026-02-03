import json, secrets, threading
from pathlib import Path

# Конфигурация путей
BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "Database.txt"
BOTS_DB_FILE = BASE_DIR.parent / "Services" / "Bots_DB.txt"

db_lock = threading.Lock()

def _access_file(path: Path, data: dict = None):
    """Универсальный внутренний метод для чтения/записи JSON с блокировкой."""
    with db_lock:
        try:
            if data is not None:
                path.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
                return True
            return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        except Exception as e:
            print(f"[!] DB Error ({path.name}): {e}")
            return {} if data is None else False

def load_db() -> dict:
    db = _access_file(DB_FILE)
    if not db and not DB_FILE.exists():
        db = {"admin": {"password": "admin", "role": "admin", "prefix": "ALL"}}
        _access_file(DB_FILE, db)
    return db

def save_db(data: dict):
    return _access_file(DB_FILE, data)

def register_user(login, password) -> bool:
    db = load_db()
    if login in db: return False
    db[login] = {"password": password, "role": "user", "prefix": f"u{secrets.token_hex(2)}"}
    return save_db(db)

def verify_user(login, password) -> dict:
    user = load_db().get(login)
    return user if user and str(user.get("password")) == str(password) else None

def load_bots_from_file() -> dict:
    """Загрузка базы ботов для инициализации UI."""
    if not BOTS_DB_FILE.exists():
        print(f"[!] Bots DB not found: {BOTS_DB_FILE.absolute()}")
        return {}
    return _access_file(BOTS_DB_FILE)