import asyncio
from loguru import logger


async def client_handler(reader:asyncio.StreamReader,writer:asyncio.StreamWriter):
    client_id = None
    addr = writer.get_extra_info('peername')

    try:
        client_id, info = await authorize_client(reader)
        if not client_id:
            writer.close()
            await writer.wait_closed()
            return

        if client_id in client:
            await client_close(client_id, send_sleep=False)

        client[client_id] = reader, writer
        client_info[client_id] = info
        logger.info(f'[+] client {client_id} connected')

        while True:
            try:
                module_name, payload_bytes = await reade_module(reader)
                if not module_name or payload_bytes is None:
                    break

                module_queue.put_nowait(client_id, module_name, payload_bytes)

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
        logger.info(f'[-] client {client_id or '?' } closed')