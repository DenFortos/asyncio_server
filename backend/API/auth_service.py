# backend/API/auth_service.py
import secrets
from .database import load_user_db, save_user_db, load_tokens, save_tokens

def generate_token(login):
    tokens = {token: user for token, user in load_tokens().items() if user != login}
    tokens[(new_token := secrets.token_hex(24))] = login
    save_tokens(tokens)
    return new_token

def get_login_by_token(token):
    return load_tokens().get(token) if token else None

def verify_user(login, password):
    user = load_user_db().get(login)
    return user if user and str(user.get("password")) == str(password) else None

def register_user(login, password):
    db = load_user_db()
    if login in db: return False
    db[login] = {"password": password, "role": "user", "prefix": f"u{secrets.token_hex(2)}"}
    return save_user_db(db)