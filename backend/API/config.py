# backend\API\config.py

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent.parent

# Пути к файлам данных
DB_FILE = BASE_DIR / "Database.txt"
TOKEN_FILE = BASE_DIR / "tokens.txt"
BOTS_DB_FILE = BASE_DIR.parent / "Services" / "Bots_DB.txt"

# Путь к фронтенду
FRONTEND_PATH = ROOT_DIR / "frontend"