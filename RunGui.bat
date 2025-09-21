@echo off
REM Переходим в директорию скрипта
cd /d %~dp0

REM Активируем виртуальное окружение
call .venv\Scripts\activate.bat

REM Запускаем скрипт GUI
python UI\GUI\RunGUI.py

REM Чтобы окно консоли не закрывалось после завершения
pause
