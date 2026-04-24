# backend/Core/network.py

import json
import asyncio
from typing import Any, Dict, Optional, Tuple, Union

import backend.LoggerWrapper as logger


def has_access(user_data: Dict[str, Any], target_identifier: str) -> bool:
    """
    Единая проверка прав доступа: admin или совпадение префикса.
    
    Логика:
    1. Если роль 'admin' — доступ разрешен.
    2. Если префикс 'ALL' — доступ разрешен.
    3. Если target_identifier начинается с префикса пользователя — доступ разрешен.
    """
    if not user_data:
        return False
        
    user_role: str = user_data.get("role", "user")
    user_prefix: str = str(user_data.get("prefix", "NONE"))
    
    return user_role == "admin" or user_prefix == "ALL" or target_identifier.startswith(user_prefix)


async def read_packet(reader: asyncio.StreamReader) -> Tuple[Optional[str], Optional[str], Any]:
    """
    Чтение и десериализация пакета.
    
    Схема байт (Header): [L1:1][L2:1][L3:4]
    Схема тела (Body): [ID:L1][MOD:L2][PAYLOAD:L3]
    """
    try:
        header_bytes: bytes = await reader.readexactly(6)
        
        id_length: int = header_bytes[0]
        module_length: int = header_bytes[1]
        payload_length: int = int.from_bytes(header_bytes[2:6], "big")
        
        body_bytes: bytes = await reader.readexactly(id_length + module_length + payload_length)
        
        bot_identifier: str = body_bytes[:id_length].decode(errors="ignore")
        module_name: str = body_bytes[id_length : id_length + module_length].decode(errors="ignore")
        raw_payload: bytes = body_bytes[id_length + module_length:]
        
        try:
            decoded_payload: str = raw_payload.decode()
            payload: Any = json.loads(decoded_payload)
        except Exception:
            try:
                payload = raw_payload.decode()
            except Exception:
                payload = raw_payload
                
        return bot_identifier, module_name, payload
        
    except Exception:
        return None, None, None


def pack_packet(bot_identifier: str, module_name: str, payload: Any) -> bytes:
    """
    Сборка бинарного пакета для отправки.
    
    Схема: [L1][L2][L3][ID][MOD][PAYLOAD]
    L1, L2 — 1 байт. L3 — 4 байта (Big-endian).
    """
    try:
        if isinstance(payload, (dict, list)):
            encoded_payload: bytes = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
        elif isinstance(payload, str):
            encoded_payload = payload.encode()
        else:
            encoded_payload = payload if isinstance(payload, bytes) else str(payload).encode()
            
        byte_id: bytes = bot_identifier.encode()
        byte_module: bytes = module_name.encode()
        
        header: bytes = (
            len(byte_id).to_bytes(1, "big") + 
            len(byte_module).to_bytes(1, "big") + 
            len(encoded_payload).to_bytes(4, "big")
        )
        
        return header + byte_id + byte_module + encoded_payload
        
    except Exception as error:
        logger.Log.error(f"[Protocol] Pack Error: {error}")
        return b""