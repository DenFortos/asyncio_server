# backend/Config.py 188.190.156.120 127.0.0.1

import os
from pathlib import Path
from typing import List

# Сетевые настройки
IP: str = "188.190.156.120"
PORT: int = 50001
API_PORT: int = 8001

# Пути (Storage в корне проекта)
BACKEND_DIR: Path = Path(__file__).resolve().parent
ROOT_DIR: Path = BACKEND_DIR.parent
STORAGE_DIR: Path = ROOT_DIR / "storage"
FRONTEND_PATH: Path = ROOT_DIR / "frontend"

# Основные директории данных
DATA_DIR: Path = STORAGE_DIR / "data"
VAULT_DIR: Path = STORAGE_DIR / "vault"

# Файлы БД (Находятся в storage/data/)
USERS_DB: Path = DATA_DIR / "users.db"
AUTH_DB: Path = DATA_DIR / "auth.db"
BOTS_DB: Path = DATA_DIR / "inventory.db"

# Инициализация структуры
required_directories: List[Path] = [DATA_DIR, VAULT_DIR]
for directory_path in required_directories:
    directory_path.mkdir(parents=True, exist_ok=True)