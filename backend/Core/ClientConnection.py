# backend/Core/ClientConnection.py

import asyncio
from logs import Log as logger
from backend.Services import authorize_client, close_client
from backend.BenchUtils import add_bytes
from backend.API.api import manager
from backend.Services.ClientManager import client, client_info, fsmap


# ==========================================
# БЛОК 1: ВЫСОКОСКОРОСТНОЙ ПАРСИНГ (MAX SPEED) [ID_LEN(1)][MOD_LEN(1)][PAY_LEN(4)] + [payload]
# ==========================================
async def read_full_packet(reader: asyncio.StreamReader):
    """Читает тех-карту 6б и добирает тело. Возвращает готовый пакет байтов."""
    try:
        # 1. Читаем заголовок (Header)
        tech = await reader.readexactly(6)

        # 2. Вычисляем длину оставшегося хвоста (ID + MOD + PAYLOAD)
        body_len = tech[0] + tech[1] + int.from_bytes(tech[2:6], "big")

        # 3. Читаем тело целиком
        body = await reader.readexactly(body_len)

        return tech + body  # Склеенный пакет для фронтенда
    except:
        return None


async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Управляет жизненным циклом подключения бота."""
    client_id = None
    ip_addr = writer.get_extra_info("peername")[0]

    try:
        # 1. Авторизация (Логика и исключения внутри authorize_client)
        auth = await authorize_client(reader, ip_addr)
        if not auth:
            writer.close()
            return

        client_id, _ = auth  # Нам нужен только ID для регистрации

        # Кикаем дубликат, если бот переподключился
        if client_id in client:
            await close_client(client_id, send_sleep=False)

        # Регистрация сессии
        client[client_id] = (reader, writer)
        logger.info(f"[+] Бот {client_id} авторизован ({ip_addr})")

        # 2. Основной цикл (Fast Path)
        while True:
            packet = await read_full_packet(reader)
            if not packet:
                break

            add_bytes(len(packet))  # Статистика

            # Пробрасываем байты в API без единой проверки
            await manager.broadcast_packet(packet)

    except (asyncio.CancelledError, ConnectionResetError, ConnectionAbortedError):
        pass
    except Exception as e:
        logger.error(f"Handler Error [{client_id}]: {e}")
    finally:
        # Очистка и закрытие
        if client_id: client.pop(client_id, None)
        try:
            if not writer.is_closing():
                writer.close()
                await writer.wait_closed()
        except:
            pass
        logger.info(f"[-] Бот {client_id or 'Unknown'} отключен.")