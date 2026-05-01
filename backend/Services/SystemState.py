# backend/Services/SystemState.py

import json
from typing import Dict, List, Any, Optional
from backend.Database import db_get_bots
from .ClientManager import active_clients, preview_cache
from .network import NetworkProtocol

class SystemStateService:
    """
    Диспетчер состояния. Собирает актуальные данные из БД и кэша.
    """

    def get_bot_full_info(self, bot_id: str) -> Optional[Dict[str, Any]]:
        """Получение расширенной информации о боте с проверкой RAM статуса."""
        all_bots: Dict[str, Any] = db_get_bots()
        bot_data: Optional[Dict[str, Any]] = all_bots.get(bot_id)
        
        if not bot_data:
            return None

        is_actually_online: bool = bot_id in active_clients
        bot_data["status"] = "online" if is_actually_online else "offline"
        
        return bot_data

    def get_global_update_packet(self) -> bytes:
        """Сборка пакета SystemInfo для всех ботов (используется при входе)."""
        bot_list: List[Dict[str, Any]] = []
        all_bots_in_db: Dict[str, Any] = db_get_bots()
        
        for identifier in all_bots_in_db.keys():
            if (info := self.get_bot_full_info(identifier)):
                bot_list.append(info)
        
        return NetworkProtocol.pack_packet(
            "SERVER", "SystemInfo", "json", "none", "none", bot_list
        )

    def get_single_bot_packet(self, bot_id: str) -> bytes:
        """Сборка пакета SystemInfo для конкретного бота (точечное обновление)."""
        if (info := self.get_bot_full_info(bot_id)):
            return NetworkProtocol.pack_packet(
                bot_id, "SystemInfo", "json", "none", "none", info
            )
        return b""

    def get_preview_packet(self, bot_id: str, image_bytes: Optional[bytes] = None) -> Optional[bytes]:
        """Сборка пакета Preview. Возвращает данные только если бот онлайн."""
        if bot_id not in active_clients and image_bytes is None:
            return None

        data: Optional[bytes] = image_bytes or preview_cache.get(bot_id)
        if data:
            return NetworkProtocol.pack_packet(
                bot_id, "Preview", "bin", "none", "none", data
            )
        return None
    
system_state: SystemStateService = SystemStateService()