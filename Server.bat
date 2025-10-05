@echo off
REM Переходим в директорию скрипта (корень проекта)
cd /d %~dp0

REM Активируем виртуальное окружение
call .venv\Scripts\activate.bat

REM Запускаем Main.py как модуль внутри пакета backend
python -m backend.Main

REM Оставляем консоль открытой после завершения скрипта
pause