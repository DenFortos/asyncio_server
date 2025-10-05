import asyncio
import json
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


async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, push_socket):
    client_id = None
    addr = writer.get_extra_info("peername")

    try:
        client_id, info = await authorize_client(reader)
        if not client_id:
            writer.close()
            await writer.wait_closed()
            return

        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client[client_id] = (reader, writer)
        client_info[client_id] = info
        logger.info(f"[+] Client {client_id} connected: {addr}")

        while True:
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

            # Отправляем header + все чанки как одно multipart-сообщение
            await push_socket.send_multipart(frames)

    except Exception as e:
        logger.info(f"[!] client_handler error: {e}")

    finally:
        if client_id:
            client.pop(client_id, None)
            client_info.pop(client_id, None)
            fsmap.pop(client_id, None)

        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

        logger.info(f"[-] Client {client_id or '?'} closed")
