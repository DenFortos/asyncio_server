# backend\Services\network.py

import json
import asyncio
from typing import Any, Dict, Optional, Tuple, Union

import backend.LoggerWrapper as logger


class NetworkProtocol:
    """
    Статический класс для реализации универсального протокола V8.0.
    Схема заголовка: [id_length: 1b] [module_length: 2b] [payload_length: 5b] (BigEndian)
    Схема данных: [L1+L2+L3] -> Body (Identifier + ModuleBody + Payload)
    """

    @staticmethod
    def has_access(user_data: Dict[str, Any], target_identifier: str) -> bool:
        """
        Проверка прав доступа пользователя к конкретному идентификатору бота.
        """
        if not user_data:
            return False

        user_role: str = user_data.get("role", "user")
        user_prefix: str = str(user_data.get("prefix", "NONE"))

        return user_role == "admin" or user_prefix == "ALL" or target_identifier.startswith(user_prefix)

    @staticmethod
    async def read_packet(reader: asyncio.StreamReader) -> Tuple[Optional[str], Optional[Dict[str, str]], Any]:
        """
        Чтение 8 байт заголовка и парсинг сегментированного тела MOD_BODY.
        Возвращает кортеж (bot_id, metadata_dict, parsed_payload).
        """
        try:
            header_bytes: bytes = await reader.readexactly(8)

            identifier_length: int = header_bytes[0]
            module_body_length: int = int.from_bytes(header_bytes[1:3], "big")
            payload_length: int = int.from_bytes(header_bytes[3:8], "big")

            total_body_length: int = identifier_length + module_body_length + payload_length
            body_content: bytes = await reader.readexactly(total_body_length)

            identifier_end: int = identifier_length
            module_end: int = identifier_length + module_body_length

            bot_identifier: str = body_content[:identifier_end].decode(errors="ignore")
            module_raw_string: str = body_content[identifier_end:module_end].decode(errors="ignore")
            payload_raw_bytes: bytes = body_content[module_end:]

            segments: list = module_raw_string.split(":")
            metadata_dictionary: Dict[str, str] = {
                "module": segments[0] if len(segments) > 0 else "Unknown",
                "type": segments[1] if len(segments) > 1 else "bin",
                "action": segments[2] if len(segments) > 2 else "None",
                "extra": segments[3] if len(segments) > 3 else "None"
            }

            if metadata_dictionary["type"] == "int":
                return bot_identifier, metadata_dictionary, int.from_bytes(payload_raw_bytes, "big")

            if metadata_dictionary["type"] == "json":
                return bot_identifier, metadata_dictionary, json.loads(payload_raw_bytes.decode("utf-8"))

            if metadata_dictionary["type"] == "str":
                return bot_identifier, metadata_dictionary, payload_raw_bytes.decode("utf-8", errors="ignore")

            return bot_identifier, metadata_dictionary, payload_raw_bytes

        except (asyncio.IncompleteReadError, ConnectionError):
            return None, None, None
        except Exception as runtime_error:
            logger.Log.error(f"[NetworkProtocol] Read Error: {runtime_error}")
            return None, None, None

    @staticmethod
    def pack_packet(bot_identifier: str, module_name: str, data_type: str, action: str, extra: str, payload: Any) -> bytes:
        """
        Упаковка данных в пакет V8.0 для отправки.
        Поддерживает автоматическую сериализацию типов json, str, int и bin.
        """
        try:
            payload_bytes: bytes = b""

            if data_type == "bin" and isinstance(payload, bytes):
                payload_bytes = payload
            elif data_type == "json":
                payload_bytes = json.dumps(payload, separators=(',', ':')).encode()
            elif data_type == "str":
                payload_bytes = str(payload).encode()
            elif data_type == "int" and isinstance(payload, int):
                payload_bytes = payload.to_bytes(5, "big")
            else:
                payload_bytes = payload if isinstance(payload, bytes) else b""

            identifier_bytes: bytes = bot_identifier.encode()
            module_body_string: bytes = f"{module_name}:{data_type}:{action}:{extra}".encode()

            header_bytes: bytes = (
                len(identifier_bytes).to_bytes(1, "big") +
                len(module_body_string).to_bytes(2, "big") +
                len(payload_bytes).to_bytes(5, "big")
            )

            return header_bytes + identifier_bytes + module_body_string + payload_bytes
        except Exception as packing_error:
            logger.Log.error(f"[NetworkProtocol] Packing Error: {packing_error}")
            return b""