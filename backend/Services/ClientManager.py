# backend/Services/ClientManager.py
import asyncio, logs.LoggerWrapper as logger
from backend.Core.network import pack_packet

active_clients = {}

async def close_client(bot_id, send_sleep=True):
    "Завершение сессии конкретного бота"
    if not (s := active_clients.pop(bot_id, None)): return False
    r, w = s
    try:
        if send_sleep: w.write(b"sleep\n"); await w.drain()
        w.close(); await w.wait_closed()
    except: pass
    finally: logger.Log.info(f"[Manager] {bot_id} disconnected")
    return True

async def close_all_clients():
    "Массовое отключение всех активных ботов"
    if not active_clients: return 0
    ids = list(active_clients.keys())
    return len(await asyncio.gather(*[close_client(bid) for bid in ids]))

def list_clients():
    "Список ID онлайн-клиентов"
    return [{"id": bid, "status": "online"} for bid in active_clients]

async def send_binary_to_bot(bot_id, pkg):
    "Отправка бинарных данных в сокет бота"
    if not (s := active_clients.get(bot_id)): return False
    try: s[1].write(pkg); await s[1].drain(); return True
    except Exception as e: logger.Log.error(f"[Manager] Send err {bot_id}: {e}"); return False