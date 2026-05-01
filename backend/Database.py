# backend/Database.py

import sqlite3
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import backend.LoggerWrapper as logger
from backend.Config import USERS_DB, AUTH_DB, BOTS_DB

def _ensure_infrastructure() -> None:
    """
    Создает необходимые директории для баз данных перед началом работы.
    """
    for db_path in [USERS_DB, AUTH_DB, BOTS_DB]:
        directory: Path = Path(db_path).parent
        if not directory.exists():
            directory.mkdir(parents=True, exist_ok=True)
            logger.Log.info(f"[Database] Created infrastructure directory: {directory}")

def _query(
    database_path: Union[str, Path], 
    sql_query: str, 
    parameters: Tuple[Any, ...] = (), 
    fetch_results: bool = False, 
    commit_changes: bool = True
) -> Any:
    """
    Универсальный метод выполнения запросов к SQLite.
    """
    connection_path: str = str(database_path)
    
    try:
        with sqlite3.connect(connection_path) as connection:
            cursor: sqlite3.Cursor = connection.cursor()
            cursor.execute(sql_query, parameters)
            
            if fetch_results:
                return cursor.fetchall()
                
            if commit_changes:
                connection.commit()
                
            return True
    except Exception as error:
        logger.Log.error(f"[Database] Query Error ({database_path}): {error}")
        return [] if fetch_results else False

def init_dbs() -> None:
    """
    Инициализация таблиц и создание файлов БД (если они отсутствуют).
    """
    _query(
        USERS_DB, 
        "CREATE TABLE IF NOT EXISTS users (login TEXT PRIMARY KEY, password TEXT, role TEXT, prefix TEXT)"
    )
    
    _query(
        USERS_DB, 
        "INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?)", 
        ("admin", "admin", "admin", "ALL")
    )
    
    _query(
        AUTH_DB, 
        "CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, login TEXT)"
    )
    
    _query(
        BOTS_DB, 
        "CREATE TABLE IF NOT EXISTS bots (bid TEXT PRIMARY KEY, data TEXT)"
    )
    logger.Log.success("[Database] All systems initialized and ready")

def db_get_users() -> Dict[str, Dict[str, str]]:
    """Получает всех зарегистрированных пользователей."""
    rows: List[Tuple[Any, ...]] = _query(
        USERS_DB, 
        "SELECT login, password, role, prefix FROM users", 
        fetch_results=True
    )
    return {
        row[0]: {"password": row[1], "role": row[2], "prefix": row[3]} 
        for row in rows
    }

def db_add_user(login: str, password_text: str, role: str, prefix: str) -> bool:
    """Регистрация нового пользователя."""
    return _query(
        USERS_DB, 
        "INSERT INTO users VALUES (?, ?, ?, ?)", 
        (login, password_text, role, prefix)
    )

def db_get_token(token: str) -> Optional[str]:
    """Проверка токена сессии."""
    results: List[Tuple[Any, ...]] = _query(
        AUTH_DB, 
        "SELECT login FROM tokens WHERE token=?", 
        (token,), 
        fetch_results=True
    )
    return results[0][0] if results else None

def db_save_token(token: str, login: str) -> bool:
    """Сохранение нового токена сессии."""
    _query(AUTH_DB, "DELETE FROM tokens WHERE login=?", (login,))
    return _query(AUTH_DB, "INSERT INTO tokens VALUES (?, ?)", (token, login))

def db_get_bots() -> Dict[str, Any]:
    """Загружает список всех известных ботов."""
    rows: List[Tuple[Any, ...]] = _query(
        BOTS_DB, 
        "SELECT bid, data FROM bots", 
        fetch_results=True
    )
    if not rows: 
        return {}
    return {row[0]: json.loads(row[1]) for row in rows}

def db_update_bot(bot_id: str, bot_data: Dict[str, Any]) -> bool:
    """Обновление данных о боте (UPSERT)."""
    sql_statement: str = """
        INSERT INTO bots (bid, data) VALUES (?, ?) 
        ON CONFLICT(bid) DO UPDATE SET data=excluded.data
    """
    return _query(BOTS_DB, sql_statement, (bot_id, json.dumps(bot_data, separators=(',', ':'))))

_ensure_infrastructure()
init_dbs()