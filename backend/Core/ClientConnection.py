# backend/Core/ClientConnection.py

import asyncio
import socket
from logs import Log as logger
from backend.Services import authorize_client, close_client
from backend.BenchUtils import add_bytes
from backend.Services.ClientManager import client
from backend.API import manager

async def read_full_packet(reader: asyncio.StreamReader):
    try:
        # Читаем заголовок (6 байт)
        tech = await reader.readexactly(6)
        # Рассчитываем длину тела: ID_LEN + MOD_LEN + PAYLOAD_LEN
        body_len = tech[0] + tech[1] + int.from_bytes(tech[2:6], "big")
        body = await reader.readexactly(body_len)
        return tech + body
    except Exception as e:
        logger.error(f"Read Packet Error: {e}")
        return None

async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    client_id = None
    ip_addr = writer.get_extra_info("peername")[0]

    transport = writer.get_extra_info('socket')
    if transport:
        transport.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    try:
        # Вызываем исправленную авторизацию
        auth = await authorize_client(reader, ip_addr)
        if not auth:
            writer.close()
            return

        client_id, _ = auth
        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client[client_id] = (reader, writer)
        logger.info(f"[+] Бот {client_id} подключен к TCP-туннелю")

        while True:
            packet = await read_full_packet(reader)
            if not packet: break

            add_bytes(len(packet))
            # Проброс на фронтенд через WebSocket
            manager.broadcast_packet_sync(packet)

    except Exception as e:
        logger.error(f"Handler Error [{client_id}]: {e}")
    finally:
        if client_id: client.pop(client_id, None)
        writer.close()