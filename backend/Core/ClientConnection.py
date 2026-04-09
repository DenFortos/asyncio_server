# backend/Core/ClientConnection.py

import asyncio
import socket

from logs import Log as logger
from backend.Services import authorize_client, close_client
from backend.BenchUtils import add_bytes
from backend.Services.ClientManager import client
from backend.API import manager
from backend.API.protocols import pack_bot_command

async def read_full_packet(reader):
    """Чтение пакета согласно протоколу 1+1+4 + Тело"""
    try:
        header = await reader.readexactly(6)
        id_len, mod_len = header[0], header[1]
        pay_len = int.from_bytes(header[2:6], "big")
        
        body = await reader.readexactly(id_len + mod_len + pay_len)
        return header + body
    except (asyncio.IncompleteReadError, Exception):
        return None

async def client_handler(reader, writer):
    """Управление жизненным циклом подключения бота"""
    client_id = None
    ip_addr = writer.get_extra_info("peername")[0]

    _set_tcp_nodelay(writer)

    try:
        # 1. Авторизация
        auth = await authorize_client(reader, ip_addr)
        if not auth:
            return await _force_close(writer)

        client_id, _ = auth
        
        # 2. Обработка дублей сессий
        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client[client_id] = (reader, writer)
        logger.info(f"[+] Бот {client_id} подключен")

        # 3. Цикл обработки трафика
        while True:
            packet = await read_full_packet(reader)
            if not packet:
                break 

            await _process_incoming(client_id, writer, packet)

    except Exception as e:
        logger.error(f"Handler Error [{client_id}]: {e}")
    finally:
        await _finalize_connection(client_id, writer)

async def _process_incoming(cid, writer, packet):
    """Обработка пакета: Pong-ответ и проброс на фронтенд"""
    try:
        # Авто-ответ Heartbeat
        pong = pack_bot_command(cid, "Heartbeat", "pong")
        writer.write(pong)
        await writer.drain()
        
        # Учет статистики и API трансляция
        add_bytes(len(packet))
        manager.broadcast_packet_sync(packet)
    except Exception as e:
        logger.error(f"[-] Respond error {cid}: {e}")

def _set_tcp_nodelay(writer):
    """Отключение алгоритма Нагла для минимизации задержек"""
    transport = writer.get_extra_info('socket')
    if transport:
        transport.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

async def _force_close(writer):
    """Немедленное закрытие без регистрации"""
    if not writer.is_closing():
        writer.close()
        await writer.wait_closed()

async def _finalize_connection(cid, writer):
    """Очистка реестра и закрытие сокета при дисконнекте"""
    if cid:
        client.pop(cid, None)
        logger.warning(f"[-] Бот {cid} покинул туннель")
    
    if not writer.is_closing():
        writer.close()
        try:
            await asyncio.wait_for(writer.wait_closed(), timeout=2.0)
        except:
            pass