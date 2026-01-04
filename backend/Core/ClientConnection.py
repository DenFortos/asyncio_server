# backend/Core/ClientConnection.py
import asyncio
import json
import time
import zmq.asyncio
from backend import ZMQ_WORKER_PUSH_API, ZMQ_CLIENT_PUSH_WORKER
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
        logger.error(f"[ReadHeader] Error reading header: {type(e).__name__}: {e}")
        return None, None, None


async def read_payload_chunks(reader: asyncio.StreamReader, payload_len: int, chunk_size: int = CHUNK_SIZE):
    """Генератор для чтения полезной нагрузки чанками."""
    remaining = payload_len
    while remaining > 0:
        to_read = min(chunk_size, remaining)
        try:
            chunk = await reader.readexactly(to_read)
        except asyncio.IncompleteReadError:
            logger.warning("[Connection] Payload read interrupted.")
            break

        remaining -= len(chunk)
        yield chunk


# ----------------------------------------------------------------------
# 2. ОБРАБОТЧИК ПОДКЛЮЧЕНИЯ
# ----------------------------------------------------------------------

async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, push_socket):
    """
    Обработчик клиента. PUSH'ит оригинальные данные клиента в API/фронтенд и в воркеры.
    """
    client_id = None
    addr = writer.get_extra_info("peername")
    ip_address = addr[0]

    # Инициализация ЛОКАЛЬНОГО ZMQ контекста
    zmq_ctx_local = zmq.asyncio.Context()

    # ⚡️ Сокет для PUSH в API/Фронтенд (использует ZMQ_WORKER_PUSH_API)
    api_push_socket = zmq_ctx_local.socket(zmq.PUSH)
    api_push_socket.connect(ZMQ_WORKER_PUSH_API)

    # ⚡️ Сокет для PUSH в Воркеры (использует ZMQ_CLIENT_PUSH_WORKER)
    worker_push_socket = zmq_ctx_local.socket(zmq.PUSH)
    worker_push_socket.connect(ZMQ_CLIENT_PUSH_WORKER)  # Вокерам нужно PULL'ить с этого адреса

    try:
        # 1. АВТОРИЗАЦИЯ
        # authorize_client возвращает: (client_id: str, original_payload_bytes: bytes)
        auth_result = await authorize_client(reader, ip_address)
        if not auth_result:
            writer.close()
            await writer.wait_closed()
            return

        # ⚡️ ИСПРАВЛЕНИЕ: Корректное распаковывание результата авторизации
        # Получаем ID (строка) и байты (для ZMQ)
        client_id, original_client_payload_bytes = auth_result

        # ⚡️ ДОПОЛНЕНИЕ: Извлечение словаря данных клиента из байтов
        try:
            # Переменная client_data не аннотирована типом Dict[str, Any]
            client_data = json.loads(original_client_payload_bytes.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            logger.error(f"[Handler] Failed to decode/parse client data after successful Auth for ID {client_id}")
            # Несмотря на успешный Auth, мы не можем работать с данными. Закрываем.
            writer.close()
            await writer.wait_closed()
            return

        # Проверка согласованности ID (хотя Auth.py уже это проверил, полезно для типа)
        if client_id != client_data.get("id"):
            logger.error(f"[Handler] Post-Auth ID mismatch. Closing connection.")
            writer.close()
            await writer.wait_closed()
            return

        # Обработка переподключения
        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client[client_id] = (reader, writer)
        # ⚡️ ОБНОВЛЕНИЕ: Храним полный словарь данных клиента
        client_info[client_id] = client_data

        logger.info(f"[+] Client {client_id} connected: {addr}")

        # 2. PUSH СТАТУСА 'ONLINE' В API (ZMQ_WORKER_PUSH_API)
        auth_update_header = {
            "client_id": client_id,
            "module": "AuthUpdate",
            "timestamp": time.time(),
            "type": "binary",  # УНИФИЦИРОВАНО: всегда "binary"
            "size": len(original_client_payload_bytes)
        }

        # Отправляем Multipart [Header JSON] [ОРИГИНАЛЬНЫЙ PAYLOAD] в API
        await api_push_socket.send_multipart([
            json.dumps(auth_update_header).encode('utf-8'),
            original_client_payload_bytes
        ])

        # 3. ОСНОВНАЯ ЛОГИКА ОБРАБОТКИ СООБЩЕНИЙ
        while True:
            # Читаем унифицированный заголовок с ID
            incoming_client_id, module_name, payload_len = await read_module_header(reader)

            if module_name is None or payload_len is None:
                break

            if incoming_client_id != client_id:
                logger.warning(
                    f"[Handler] Client {client_id} sent message with mismatched ID: {incoming_client_id}. Dropping.")
                continue

            # Формируем унифицированный header для воркеров
            header = {
                "client_id": client_id,
                "module": module_name,
                "timestamp": time.time(),
                "type": "binary",  # УНИФИЦИРОВАНО: всегда "binary" при отправке в воркер
                "size": payload_len,
            }
            header_bytes = json.dumps(header).encode()

            # Читаем все чанки
            frames = [header_bytes]
            async for chunk in read_payload_chunks(reader, payload_len):
                add_bytes(len(chunk))
                frames.append(chunk)

            # Отправляем ZMQ Multipart [Header JSON] [Chunk 1] [Chunk 2]... (ВОРКЕРАМ)
            await worker_push_socket.send_multipart(frames)

    except Exception as e:
        logger.error(f"[!] client_handler error: {type(e).__name__}: {e}")

    finally:
        # 4. PUSH СТАТУСА 'OFFLINE' В API
        if client_id:
            client_data_to_send = client_info.get(client_id, {"id": client_id})

            client.pop(client_id, None)
            client_info.pop(client_id, None)
            fsmap.pop(client_id, None)

            # ГЕНЕРАЦИЯ OFFLINE-сообщения
            client_data_to_send["status"] = "offline"
            offline_payload_bytes = json.dumps(client_data_to_send).encode('utf-8')

            offline_update_header = {
                "client_id": client_id,
                "module": "AuthUpdate",
                "timestamp": time.time(),
                "type": "binary",
                "size": len(offline_payload_bytes)
            }
            try:
                # Отправляем Multipart [Header JSON] [Payload Bytes] в API
                await api_push_socket.send_multipart([
                    json.dumps(offline_update_header).encode('utf-8'),
                    offline_payload_bytes
                ])
            except Exception:
                pass

        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

        # 5. Очистка локальных ZMQ сокетов
        api_push_socket.close()
        worker_push_socket.close()
        zmq_ctx_local.term()
        logger.info(f"[-] Client {client_id or '?'} closed. ZMQ closed.")
