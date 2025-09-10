client = {}
client_info = {}
fsmap = {}

async def close_client(client_id, send_sleep=True):
    if client_id in client:
        _, writer = await client[client_id]
        if send_sleep:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception as e:
                pass