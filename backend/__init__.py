# backend/__init__.py
from backend.BenchUtils import add_bytes, start_benchmark
from backend.Config import API_PORT, IP, PORT
from backend.API.api import run_fastapi_server, manager