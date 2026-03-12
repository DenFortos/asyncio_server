# backend/API/__init__.py

from .api import run_fastapi_server, manager, app

# Теперь из любой точки проекта можно сделать:
# from backend.API import manager, run_fastapi_server