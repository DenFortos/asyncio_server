# backend/API/__init__.py

# Импортируем главный объект FastAPI app
from .api import app

# Импортируем функцию запуска сервера (для multiprocessing)
from .api import run_fastapi_server

# Импортируем набор WebSocket-соединений (если он нужен для других частей бэкенда,
# но пока оставим его внутренним для API.py)

# Мы вынесли run_fastapi_server() и app для удобного импорта:
# from backend.API import run_fastapi_server