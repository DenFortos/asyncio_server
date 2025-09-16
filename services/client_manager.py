from loguru import logger

client = {}
client_info = {}
fsmap = {}

async def close_client(client_id, send_sleep=True):
    if client_id in client:
        _, writer = client[client_id]
        if send_sleep:
            try:
                writer.write(b"sleep\n")
                await writer.drain()
            except Exception:
                pass
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass
        client.pop(client_id, None)
        client_info.pop(client_id, None)
        fsmap.pop(client_id, None)

async def close_all_client():
    for cid in list(client.keys()):
        await close_client(cid)