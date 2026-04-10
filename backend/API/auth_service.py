# backend/API/auth_service.py

import secrets
from .database import load_user_db, save_user_db, load_tokens, save_tokens

def generate_token(login: str) -> str:
    """Создание сессионного токена с удалением старых сессий пользователя"""
    tokens = {t: u for t, u in load_tokens().items() if u != login}
    new_token = secrets.token_hex(24)
    tokens[new_token] = login
    save_tokens(tokens)
    return new_token

def get_login_by_token(token: str) -> str:
    """Получение владельца токена"""
    return load_tokens().get(token) if token else None

def verify_user(login, password) -> dict:
    """Проверка пары логин/пароль"""
    user = load_user_db().get(login)
    if user and str(user.get("password")) == str(password):
        return user
    return None

def register_user(login, password) -> bool:
    """Регистрация нового аккаунта с генерацией уникального префикса"""
    db = load_user_db()
    if login in db: return False
    
    # Генерируем префикс типа uae4
    prefix = f"u{secrets.token_hex(2)}"
    db[login] = {"password": password, "role": "user", "prefix": prefix}
    return save_user_db(db)