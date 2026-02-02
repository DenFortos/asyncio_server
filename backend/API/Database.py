import json, secrets, threading
from pathlib import Path

DB_FILE = Path(__file__).parent / "Database.txt"
db_lock = threading.Lock()


def load_db() -> dict:
    """Загружает БД. Если файла нет — создает админа по умолчанию."""
    if not DB_FILE.exists():
        admin = {"admin": {"password": "admin", "role": "admin", "prefix": "ALL"}}
        save_db(admin)
        return admin

    with db_lock:
        try:
            content = DB_FILE.read_text(encoding="utf-8").strip()
            return json.loads(content) if content else {}
        except Exception as e:
            print(f"[!] DB Load Error: {e}")
            return {}


def save_db(data: dict):
    """Потокобезопасное сохранение данных."""
    with db_lock:
        try:
            DB_FILE.write_text(json.dumps(data, indent=4, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[!] DB Save Error: {e}")


def register_user(login, password) -> bool:
    """Регистрирует юзера с уникальным префиксом."""
    db = load_db()
    if login in db:
        return False

    db[login] = {
        "password": password,
        "role": "user",
        "prefix": f"u{secrets.token_hex(2)}"
    }
    save_db(db)
    return True


def verify_user(login, password) -> dict:
    """Проверяет учетные данные."""
    user = load_db().get(login)
    if user and str(user.get("password")) == str(password):
        return user
    return None