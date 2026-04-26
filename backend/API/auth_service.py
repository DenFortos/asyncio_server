# backend/API/auth_service.py

import secrets
from typing import Any, Dict, Optional
from backend.Database import db_get_users, db_get_token, db_save_token


def generate_token(login: str) -> str:
    """Генерирует и сохраняет сессионный токен (24 байта)."""
    session_token: str = secrets.token_hex(24)
    db_save_token(session_token, login)
    return session_token


def get_login_by_token(token: Optional[str]) -> Optional[str]:
    """Поиск логина в БД по активному токену."""
    if not token:
        return None
    return db_get_token(token)


def verify_user(login: str, password_text: str) -> Optional[Dict[str, Any]]:
    """Проверка учетных данных пользователя."""
    users_database: Dict[str, Any] = db_get_users()
    user_object: Optional[Dict[str, Any]] = users_database.get(login)

    # Приведение к str необходимо для корректного сравнения с данными из JSON/DB
    if user_object and str(user_object.get("password")) == str(password_text):
        return user_object

    return None