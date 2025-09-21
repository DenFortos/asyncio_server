@echo off
REM Переходим в директорию скрипта
cd /d %~dp0

REM Активируем виртуальное окружение
call .venv\Scripts\activate.bat

REM Запускаем Main.py
python Main.py

REM Оставляем консоль открытой после завершения скрипта
pause
