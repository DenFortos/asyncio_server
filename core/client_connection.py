import asyncio
from loguru import logger
from queue_worker import module_queue
from services import authorize_client, close_client, client, client_info, fsmap

async def read_module(reader: asyncio.StreamReader):
    try:
        name_len_bytes = await reader.readexactly(1)
        name_len = name_len_bytes[0]
        module_name = (await reader.readexactly(name_len)).decode("utf-8")

        payload_len_bytes = await reader.readexactly(4)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        return module_name, payload_len
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
        logger.info(f'[+] client {client_id} connected')

        while True:
            try:
                module_name, payload_len = await read_module(reader)
                if not module_name or payload_len is None:
                    break
                module_queue.put_nowait((client_id, module_name, payload_len))
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
