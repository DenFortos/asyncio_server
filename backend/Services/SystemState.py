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
        all_bots = db_get_bots()
        # Получаем данные из БД.
        bot_data = all_bots.get(bot_id)
        
        if not bot_data:
            return None

        # СТРОГАЯ ПРОВЕРКА: статус онлайн только если есть живое соединение в RAM
        is_actually_online = bot_id in active_clients
        bot_data["status"] = "online" if is_actually_online else "offline"
        
        # Мы НЕ обновляем last_active здесь. Оно берется из БД "как есть".
        return bot_data

    def get_global_update_packet(self) -> bytes:
        """Сборка пакета SystemInfo для всех ботов."""
        bot_list = []
        all_bots_in_db = db_get_bots()
        
        # Итерируемся по всем ботам, которые когда-либо были в базе
        for bid in all_bots_in_db.keys():
            info = self.get_bot_full_info(bid)
            if info: 
                bot_list.append(info)
        
        return NetworkProtocol.pack_packet(
            "SERVER", "SystemInfo", "json", "none", "none", bot_list
        )

    def get_preview_packet(self, bot_id: str, image_bytes: Optional[bytes] = None) -> Optional[bytes]:
        """Сборка пакета Preview. Возвращает данные только если бот онлайн."""
        # Если бот офлайн и нам не передали свежие байты принудительно - ничего не шлем
        if bot_id not in active_clients and image_bytes is None:
            return None

        data = image_bytes or preview_cache.get(bot_id)
        if data:
            return NetworkProtocol.pack_packet(
                bot_id, "Preview", "bin", "none", "none", data
            )
        return None
    
system_state = SystemStateService()