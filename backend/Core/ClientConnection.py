import asyncio
import json
import time
import zmq.asyncio
from backend import ZMQ_WORKER_PUSH_ADDR
from logs import Log as logger
from backend.Services import authorize_client, close_client, client, client_info, fsmap
from backend.BenchUtils import add_bytes
import zmq

CHUNK_SIZE = 16 * 1024  # 16 KB

async def read_module_header(reader: asyncio.StreamReader):
    try:
        name_len_bytes = await reader.readexactly(1)
        name_len = name_len_bytes[0]

        module_name_bytes = await reader.readexactly(name_len)
        module_name = module_name_bytes.decode("utf-8", errors="replace")

        payload_len_bytes = await reader.readexactly(4)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        return module_name, payload_len
    except asyncio.IncompleteReadError:
        logger.info("[!] Read module - connection error")
        return None, None
    except Exception as e:
        logger.info(f"[!] Read module - unknown error: {e}")
        return None, None


async def read_payload_chunks(reader: asyncio.StreamReader, payload_len: int, chunk_size: int = CHUNK_SIZE):
    remaining = payload_len
    while remaining > 0:
        to_read = min(chunk_size, remaining)
        chunk = await reader.readexactly(to_read)
        remaining -= len(chunk)
        yield chunk


# Предполагается, что authorize_client был исправлен, чтобы принимать IP
# и возвращать полный стандартизированный словарь, как мы договорились.
async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, push_socket):
    client_id = None
    addr = writer.get_extra_info("peername")
    ip_address = addr[0]  # Получаем IP клиента

    # Инициализация ZMQ PUSH сокета для отправки данных API/Фронтенду
    zmq_ctx_local = zmq.asyncio.Context()
    api_push_socket = zmq_ctx_local.socket(zmq.PUSH)
    api_push_socket.connect(ZMQ_WORKER_PUSH_ADDR)

    try:
        # 1. АВТОРИЗАЦИЯ (Используем исправленную логику)
        client_data = await authorize_client(reader, ip_address)  # Теперь принимает IP
        if not client_data:
            writer.close()
            await writer.wait_closed()
            return

        client_id = client_data.get("id")  # Получаем ID из полного словаря

        if client_id in client:
            await close_client(client_id, send_sleep=False)

        # Сохраняем ВЕСЬ стандартизированный объект
        client[client_id] = (reader, writer)
        client_info[client_id] = client_data

        logger.info(f"[+] Client {client_id} connected: {addr}")

        # 2. PUSH СТАТУСА 'ONLINE' В API (ZMQ_WORKER_PUSH_ADDR)
        auth_update_message = {
            "client_id": client_id,
            "module": "AuthUpdate",
            "timestamp": time.time(),
            "type": "json",
            "data": client_data  # Отправляем полный объект
        }
        await api_push_socket.send_json(auth_update_message)

        # 3. ОСНОВНАЯ ЛОГИКА ОБРАБОТКИ СООБЩЕНИЙ
        while True:
            # ... (Весь остальной код для чтения и отправки в push_socket остается прежним)
            module_name, payload_len = await read_module_header(reader)
            if module_name is None or payload_len is None:
                break

            chunk_count = (payload_len + CHUNK_SIZE - 1) // CHUNK_SIZE

            # Формируем header
            header = {
                "client_id": client_id,
                "module_name": module_name,
                "payload_len": payload_len,
                "chunk_count": chunk_count,
            }
            header_bytes = json.dumps(header).encode()

            # Читаем все чанки
            frames = [header_bytes]
            async for chunk in read_payload_chunks(reader, payload_len):
                add_bytes(len(chunk))
                frames.append(chunk)

            # Отправляем header + все чанки как одно multipart-сообщение (ВОРКЕРАМ)
            await push_socket.send_multipart(frames)

    except Exception as e:
        logger.info(f"[!] client_handler error: {e}")

    finally:
        # 4. PUSH СТАТУСА 'OFFLINE' В API
        if client_id:
            client.pop(client_id, None)
            client_info.pop(client_id, None)
            fsmap.pop(client_id, None)

            offline_update_message = {
                "client_id": client_id,
                "module": "AuthUpdate",
                "timestamp": time.time(),
                "type": "json",
                "data": {"id": client_id, "status": "offline"}
            }
            try:
                await api_push_socket.send_json(offline_update_message)
            except Exception:
                pass

        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

        # 5. Очистка локального ZMQ сокета
        api_push_socket.close()
        zmq_ctx_local.term()
        logger.info(f"[-] Client {client_id or '?'} closed. ZMQ closed.")