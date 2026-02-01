import json
import secrets
import threading
from pathlib import Path

# Путь к файлу базы данных
DB_FILE = Path(__file__).parent / "Database.txt"

# Лок для предотвращения конфликтов записи/чтения из разных потоков FastAPI
db_lock = threading.Lock()


def load_db() -> dict:
    """Загружает базу из файла с обработкой ошибок и созданием админа."""
    with db_lock:
        if not DB_FILE.exists():
            admin_data = {
                "admin": {
                    "password": "admin",  # Рекомендуется сменить после первого входа
                    "role": "admin",
                    "prefix": "ALL"
                }
            }
            # Сохраняем сразу, чтобы файл появился
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(admin_data, f, indent=4, ensure_ascii=False)
            return admin_data

        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except (json.JSONDecodeError, Exception) as e:
            # Если файл поврежден, лучше не возвращать пустой словарь,
            # чтобы save_db не удалил всех юзеров.
            print(f"[!] Ошибка базы данных: {e}")
            return {}


def save_db(data: dict):
    """Сохраняет данные в файл. Вызывается внутри функций с уже взятым локом."""
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[!] Ошибка сохранения базы: {e}")


def register_user(login, password):
    """Регистрирует нового пользователя с уникальным префиксом."""
    # Берем лок на всё время операции 'чтение-изменение-запись'
    with db_lock:
        # Загружаем актуальную версию (повторяем логику load, но внутри лока)
        db = {}
        if DB_FILE.exists():
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    db = json.load(f)
            except:
                db = {}

        if login in db:
            return None

            # Генерация префикса (например, u80a9)
        prefix = f"u{secrets.token_hex(2)}"

        db[login] = {
            "password": password,
            "role": "user",
            "prefix": prefix
        }

        # Сохраняем
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=4, ensure_ascii=False)

        return True


def verify_user(login, password):
    """Проверяет данные для входа. Потокобезопасно."""
    db = load_db()
    user = db.get(login)
    if user and str(user.get("password")) == str(password):
        return user
    return None