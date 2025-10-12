@echo off
CHCP 65001 > nul
title SpectralWeb C2 Backend Server (Port 8001)

REM Переходим в директорию скрипта (корень проекта)
cd /d "%~dp0"

echo.
echo =========================================================
echo [+] Starting SpectralWeb C2 Backend (FastAPI, ZMQ)
echo [+] Server will run on http://127.0.0.1:8001
echo =========================================================
echo.

REM -------------------------------------------------------------
REM ЗАПУСК БЭКЕНДА В НОВОМ ОКНЕ (/min - запускает свернутым, /k - оставляет окно открытым)
REM Важно: активируем окружение и запускаем команду в новом окне.
REM -------------------------------------------------------------

start "FastAPI Backend" cmd /min /k "call .venv\Scripts\activate.bat && python -m backend.Main"

echo [+] Backend initiated. Check the new window for server logs.
echo.
echo [!] Press any key to close this launcher console.
pause > nul