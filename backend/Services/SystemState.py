# backend\Services\SystemState.py

import json
from typing import Dict, List, Any, Optional
from backend.Database import db_get_bots
# Импортируем кэш и активных клиентов из ClientManager
from .ClientManager import active_clients, preview_cache
from .network import pack_packet
from backend.API.connection_manager import manager

class SystemStateService:
    """Диспетчер состояния. Упаковывает данные в пакеты V7.2."""

    def get_bot_full_info(self, bot_id: str) -> Optional[Dict[str, Any]]:
        bot_data = db_get_bots().get(bot_id, {})
        if not bot_data and bot_id not in active_clients: return None
        
        return {
            **bot_data,
            "id": bot_id,
            "status": "online" if bot_id in active_clients else "offline",
            "has_preview": bot_id in preview_cache
        }

    def broadcast_global_update(self) -> None:
        """Рассылка списка всех ботов (JSON пакет)."""
        bot_list = []
        for bid in set(list(db_get_bots().keys()) + list(active_clients.keys())):
            info = self.get_bot_full_info(bid)
            if info: bot_list.append(info)
        
        packet = pack_packet("DASHBOARD", "SystemInfo:None", bot_list)
        manager.broadcast_packet_sync(packet)

    def broadcast_preview(self, bot_id: str, image_bytes: Optional[bytes] = None) -> None:
        """
        Отправка превью по формуле: [Preview]:[None] + Payload = [Bytes]
        """
        data = image_bytes or preview_cache.get(bot_id)
        if data:
            # Отправляем БЕЗ анонса размера, просто один пакет с байтами
            packet = pack_packet(bot_id, "Preview:None", data)
            manager.broadcast_packet_sync(packet)

system_state = SystemStateService()