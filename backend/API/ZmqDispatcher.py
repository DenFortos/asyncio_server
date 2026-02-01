import asyncio
import zmq.asyncio
from typing import Dict
from logs import Log as logger


async def zmq_message_dispatcher(packet: bytes, connections: Dict[str, dict]):
    """
    Разбирает бинарный пакет и рассылает его нужным WebSocket-клиентам.
    Протокол: [ID_len(1)][ID][Mod_len(1)][Mod][Pay_len(4)][Payload]
    """
    if not packet:
        return

    if not connections:
        # Это важный момент: если в таблице никого нет, пакеты просто дропаются
        return

    try:
        cursor = 0

        # 1. Извлекаем ID бота
        id_len = packet[cursor]
        cursor += 1
        bot_id = packet[cursor: cursor + id_len].decode('utf-8', errors='ignore')
        cursor += id_len

        # 2. Извлекаем префикс (всё до первого дефиса)
        bot_prefix = bot_id.split('-')[0] if '-' in bot_id else bot_id

        # 3. Извлекаем Модуль (для логов)
        mod_len = packet[cursor]
        cursor += 1
        module_name = packet[cursor: cursor + mod_len].decode('utf-8', errors='ignore')

    except Exception as e:
        logger.error(f"[ZMQ Dispatcher] Ошибка разбора пакета: {e}")
        return

    # Рассылаем пакет авторизованным пользователям
    found_target = False
    for login, session in list(connections.items()):
        # Проверка прав:
        # Админ с префиксом ALL видит всё.
        # Обычный юзер видит только если префикс сессии совпадает с началом ID бота.
        is_admin = (session.get("role") == "admin" or session.get("prefix") == "ALL")
        is_owner = (session.get("prefix") == bot_prefix)

        if is_admin or is_owner:
            sockets = session.get("sockets", [])
            if sockets:
                found_target = True
                for ws in sockets:
                    # Запускаем отправку в фоне, чтобы не блокировать цикл диспетчера
                    asyncio.create_task(safe_send(ws, packet, login))

    if not found_target:
        # Если это сообщение часто спамит — значит либо никто не залогинен,
        # либо префиксы не совпадают (например, бот u80a9, а у юзера ua4e1)
        logger.debug(f"[ZMQ] Пакет от {bot_id} ({module_name}) не нашел получателя.")


async def safe_send(ws, packet: bytes, login: str):
    """Безопасная отправка бинарных данных в WebSocket"""
    try:
        await ws.send_bytes(packet)
    except Exception as e:
        # Ошибка обычно значит, что клиент закрыл вкладку, API.py сам удалит сокет
        pass


async def zmq_pull_task_loop(connections: Dict[str, dict], zmq_url: str):
    """Основной цикл прослушивания шины ZMQ от воркеров"""
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = zmq_ctx.socket(zmq.PULL)

    # HWM 0 позволяет не терять пакеты при большой нагрузке
    pull_socket.set_hwm(0)

    try:
        # API BIND-ит сокет, воркеры к нему CONNECT-ятся
        pull_socket.bind(zmq_url)
        logger.info(f"[ZMQ Dispatcher] Приемник запущен на {zmq_url}")
    except Exception as e:
        logger.error(f"[ZMQ Dispatcher] Critical Bind Error: {e}")
        return

    while True:
        try:
            # Ожидаем пакет от воркера
            packet = await pull_socket.recv()
            if packet:
                await zmq_message_dispatcher(packet, connections)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[ZMQ Dispatcher] Ошибка цикла: {e}")
            await asyncio.sleep(0.01)

    pull_socket.close()
    zmq_ctx.term()
    logger.info("[ZMQ Dispatcher] Цикл завершен.")