# backend/API/auth_service.py
import secrets
from .database import load_user_db, save_user_db, load_tokens, save_tokens

def generate_token(login):
    "Генерация нового токена с удалением старых сессий пользователя"
    tokens = {t: u for t, u in load_tokens().items() if u != login}
    tokens[(new_t := secrets.token_hex(24))] = login
    save_tokens(tokens); return new_t

def get_login_by_token(token):
    "Получение логина по токену"
    return load_tokens().get(token) if token else None

def verify_user(login, pwd):
    "Проверка учетных данных"
    u = load_user_db().get(login)
    return u if u and str(u.get("password")) == str(pwd) else None

def register_user(login, pwd):
    "Регистрация нового пользователя с генерацией префикса"
    db = load_user_db()
    if login in db: return False
    db[login] = {"password": pwd, "role": "user", "prefix": f"u{secrets.token_hex(2)}"}
    return save_user_db(db)