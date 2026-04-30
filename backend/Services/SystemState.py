# backend/Services/SystemState.py

import json
from typing import Dict, List, Any, Optional
from backend.Database import db_get_bots
from .ClientManager import active_clients, preview_cache
from .network import NetworkProtocol

class SystemStateService:
    """
    Диспетчер состояния. Только СОБИРАЕТ данные в пакеты V8.0.
    """

    def get_bot_full_info(self, bot_id: str) -> Optional[Dict[str, Any]]:
        all_bots = db_get_bots()
        bot_data = all_bots.get(bot_id, {"id": bot_id})
        bot_data["status"] = "online" if bot_id in active_clients else "offline"
        bot_data["has_preview"] = bot_id in preview_cache
        return bot_data

    def get_global_update_packet(self) -> bytes:
        """Возвращает готовый бинарный пакет со списком всех ботов."""
        bot_list = []
        known_ids = set(list(db_get_bots().keys()) + list(active_clients.keys()))
        for bid in known_ids:
            info = self.get_bot_full_info(bid)
            if info: bot_list.append(info)
        
        return NetworkProtocol.pack_packet(
            "SERVER", "SystemInfo", "json", "none", "none", bot_list
        )

    def get_preview_packet(self, bot_id: str, image_bytes: Optional[bytes] = None) -> Optional[bytes]:
        """Возвращает готовый пакет с превью."""
        data = image_bytes or preview_cache.get(bot_id)
        if data:
            return NetworkProtocol.pack_packet(
                bot_id, "Preview", "bin", "none", "none", data
            )
        return None

system_state = SystemStateService()