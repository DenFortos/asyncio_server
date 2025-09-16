import asyncio
import queue
from loguru import logger
from .queue_worker import module_queue
from services import authorize_client, close_client, client, client_info, fsmap

async def read_module(reader: asyncio.StreamReader):
    try:
        name_len_bytes = await reader.readexactly(1)
        name_len = name_len_bytes[0]

        payload_len_bytes = await reader.readexactly(4)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        return name_len, payload_len
    except asyncio.IncompleteReadError:
        logger.info('[!] Read module - connection error')
        return None, None
    except UnicodeDecodeError:
        logger.info('[!] Read module - decode error')
        return None, None
    except Exception as e:
        logger.info(f'[!] Read module - unknown error: {e}')
        return None, None


async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    client_id = None
    addr = writer.get_extra_info('peername')
    sock = writer.get_extra_info('socket')
    try:
        client_id, info = await authorize_client(reader)
        if not client_id:
            writer.close()
            await writer.wait_closed()
            return

        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client[client_id] = reader, writer
        client_info[client_id] = info
        logger.info(f'[+] client {client_id} connected: {addr}')

        while True:
            try:
                name_len, payload_len = await read_module(reader)
                if name_len is None or payload_len is None:
                    break

                try:
                    module_queue.put_nowait((client_id, name_len, payload_len, sock.fileno()))
                except queue.Full:
                    logger.warning(f"[!] Queue full, dropping module from client {client_id}")

            except Exception as e:
                logger.info(f'[!] error read module: {e}')
                break

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
        logger.info(f'[-] client {client_id or "?"} closed')
