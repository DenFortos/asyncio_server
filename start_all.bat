@echo off
CHCP 65001 > nul
title SpectralWeb C2 System

REM Переходим в директорию скрипта (корень проекта)
cd /d %~dp0

REM Активируем виртуальное окружение
call .venv\Scripts\activate.bat

echo [+] Backend and Frontend (FastAPI, ZMQ, UI) initiated on port 8001.

REM 1. ЗАПУСК БЭКЕНДА: CMD-окно ждет завершения python.exe
python -m backend.Main

REM 2. КОМАНДЫ ПОСЛЕ ЗАВЕРШЕНИЯ PYTHON:
REM Как только пользователь введет '0' в Python CLI, выполнение перейдет сюда.

echo.
echo [!] Завершение работы CMD.
timeout /t 2 /nobreak > nul
taskkill /IM python.exe /F 2>nul
echo [!] Все процессы завершены.
pause