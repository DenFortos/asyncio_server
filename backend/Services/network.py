# backend/Core/network.py

import json
import asyncio
from typing import Any, Dict, Optional, Tuple, Union

import backend.LoggerWrapper as logger


def has_access(user_data: Dict[str, Any], target_identifier: str) -> bool:
    """
    Проверка прав доступа пользователя к конкретному боту по роли или префиксу.
    """
    if not user_data:
        return False
        
    user_role: str = user_data.get("role", "user")
    user_prefix: str = str(user_data.get("prefix", "NONE"))
    
    return user_role == "admin" or user_prefix == "ALL" or target_identifier.startswith(user_prefix)


async def read_packet(reader: asyncio.StreamReader) -> Tuple[Optional[str], Optional[str], Any]:
    """
    Чтение и парсинг пакета V7.2 с автоматической конвертацией анонсов в int.
    """
    try:
        header_bytes: bytes = await reader.readexactly(6)
        
        id_length: int = header_bytes[0]
        module_length: int = header_bytes[1]
        payload_length: int = int.from_bytes(header_bytes[2:6], "big")
        
        body_bytes: bytes = await reader.readexactly(id_length + module_length + payload_length)
        
        bot_identifier: str = body_bytes[:id_length].decode(errors="ignore")
        module_body: str = body_bytes[id_length : id_length + module_length].decode(errors="ignore")
        raw_payload: bytes = body_bytes[id_length + module_length:]
        
        if len(raw_payload) == 4 and "Stream" not in module_body:
            return bot_identifier, module_body, int.from_bytes(raw_payload, "big")

        try:
            decoded_text = raw_payload.decode('utf-8')
            try:
                payload = json.loads(decoded_text)
            except json.JSONDecodeError:
                payload = decoded_text
        except UnicodeDecodeError:
            payload = raw_payload
                
        return bot_identifier, module_body, payload
        
    except (asyncio.IncompleteReadError, ConnectionError):
        return None, None, None
    except Exception as error:
        logger.Log.error(f"[Protocol] Read Error: {error}")
        return None, None, None


def pack_packet(bot_id: str, module_meta: str, payload: Any) -> bytes:
    """
    Универсальная упаковка V7.2 для C2 -> Frontend.
    Формат: [id_len(1)][mod_len(1)][pay_len(4)][ID][MOD:META][PAYLOAD]
    """
    # 1. Готовим Payload
    if isinstance(payload, bytes):
        p_bytes = payload
    elif isinstance(payload, (dict, list)):
        p_bytes = json.dumps(payload, separators=(',', ':')).encode()
    else:
        p_bytes = str(payload).encode()

    # 2. Готовим ID и MOD
    id_bytes = bot_id.encode()
    mod_bytes = module_meta.encode()

    # 3. Сборка заголовка (6 байт)
    header = (
        len(id_bytes).to_bytes(1, 'big') +
        len(mod_bytes).to_bytes(1, 'big') +
        len(p_bytes).to_bytes(4, 'big')
    )

    return header + id_bytes + mod_bytes + p_bytes