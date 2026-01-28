# backend/Core/ClientConnection.py
import asyncio
import json
import time
import zmq.asyncio
from backend import ZMQ_CLIENT_PUSH_WORKER
from logs import Log as logger
from backend.Services import authorize_client, close_client, client, client_info, fsmap
from backend.BenchUtils import add_bytes

CHUNK_SIZE = 16 * 1024  # 16 KB


async def read_module_header(reader: asyncio.StreamReader):
    """
    Читает унифицированный заголовок: [ID_len] [ID] [Module_len] [Module_name] [Payload_len]
    Возвращает (client_id, module_name, payload_len).
    """
    try:
        # 1. Читаем длину ID (1 байт)
        id_len_bytes = await reader.readexactly(1)
        id_len = id_len_bytes[0]

        # 2. Читаем ID
        client_id_bytes = await reader.readexactly(id_len)
        client_id = client_id_bytes.decode("utf-8", errors="ignore")

        # 3. Читаем длину имени модуля (1 байт)
        name_len_bytes = await reader.readexactly(1)
        name_len = name_len_bytes[0]

        # 4. Читаем имя модуля
        module_name_bytes = await reader.readexactly(name_len)
        module_name = module_name_bytes.decode("utf-8", errors="ignore")

        # 5. Читаем длину Payload (4 байта, Big Endian)
        payload_len_bytes = await reader.readexactly(4)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        return client_id, module_name, payload_len

    except asyncio.IncompleteReadError:
        # Соединение закрыто клиентом до прочтения заголовка
        return None, None, None
    except Exception as e:
        logger.error(f"[ReadHeader] Ошибка чтения заголовка: {type(e).__name__}: {e}")
        return None, None, None


async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, push_socket):
    client_id = None
    addr = writer.get_extra_info("peername")
    ip_address = addr[0]

    try:
        # 1. АВТОРИЗАЦИЯ
        auth_result = await authorize_client(reader, ip_address)
        if not auth_result:
            writer.close()
            await writer.wait_closed()
            return

        client_id, payload_dict = auth_result

        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client_info[client_id] = payload_dict
        client[client_id] = (reader, writer)
        logger.info(f"[+] Клиент {client_id} подключен: {addr}")

        # 2. ОСНОВНАЯ ЛОГИКА
        while True:
            # Читаем заголовок
            incoming_client_id, module_name, payload_len = await read_module_header(reader)

            if module_name is None:  # Соединение закрыто
                break

            if incoming_client_id != client_id:
                logger.warning(f"[Handler] Несовпадение ID: {incoming_client_id}. Пропуск.")
                # Если ID не тот, нужно вычитать payload из сокета, чтобы не сломать следующий заголовок
                await reader.readexactly(payload_len)
                continue

            # Читаем ВЕСЬ payload разом
            try:
                payload = await reader.readexactly(payload_len)
                add_bytes(payload_len)  # Бенчмарк обновится один раз, но точно
            except asyncio.IncompleteReadError:
                logger.error(f"[!] Ошибка: Payload {module_name} оборван.")
                break

            # Формируем заголовок для воркера
            header = {
                "client_id": client_id,
                "module": module_name,
                "timestamp": time.time(),
                "type": "binary",
                "size": payload_len,
            }
            header_bytes = json.dumps(header).encode('utf-8')

            # Отправляем ZMQ Multipart: [Header] [Full Payload]
            # Это гарантирует, что ОДИН воркер получит ОДНО сообщение целиком
            await push_socket.send_multipart([header_bytes, payload])

    except Exception as e:
        logger.error(f"[!] Ошибка в client_handler: {type(e).__name__}: {e}")

    finally:
        if client_id:
            client.pop(client_id, None)
            client_info.pop(client_id, None)
            fsmap.pop(client_id, None)

        writer.close()
        await writer.wait_closed()
        logger.info(f"[-] Клиент {client_id or '?'} отключен.")