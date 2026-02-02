import asyncio
import zmq.asyncio
from typing import Dict
from logs import Log as logger


async def zmq_message_dispatcher(packet: bytes, connections: Dict[str, dict]):
    """Разбирает бинарный пакет и рассылает его активным сессиям."""
    if not packet or not connections:
        return

    try:
        # 1. Парсинг заголовка (ID и Модуль)
        id_len = packet[0]
        bot_id = packet[1: 1 + id_len].decode('utf-8', errors='ignore')

        mod_offset = 1 + id_len
        mod_len = packet[mod_offset]
        module_name = packet[mod_offset + 1: mod_offset + 1 + mod_len].decode('utf-8', errors='ignore')

        # Префикс для проверки прав (ua4e1-...)
        bot_prefix = bot_id.split('-')[0]
    except Exception as e:
        logger.error(f"[ZMQ] Ошибка парсинга: {e}")
        return

    # 2. Рассылка по активным сессиям
    found_target = False
    for login, session in list(connections.items()):
        # Логика прав: Admin или совпадение префикса
        is_allowed = (
                session.get("role") == "admin" or
                session.get("prefix") == "ALL" or
                session.get("prefix") == bot_prefix
        )

        if is_allowed:
            sockets = session.get("sockets", [])
            if sockets:
                found_target = True
                # Создаем задачи на отправку, чтобы один медленный сокет не тормозил весь поток
                for ws in sockets:
                    asyncio.create_task(safe_send(ws, packet))

    if not found_target:
        logger.debug(f"[ZMQ] Нет получателя для {bot_id} [{module_name}]")


async def safe_send(ws, packet: bytes):
    """Безопасная асинхронная отправка."""
    try:
        await ws.send_bytes(packet)
    except:
        pass  # Ошибки сокета обрабатываются в основном цикле api.py


async def zmq_pull_task_loop(connections: Dict[str, dict], zmq_url: str):
    """Основной цикл прослушивания шины ZMQ."""
    ctx = zmq.asyncio.Context()
    sock = ctx.socket(zmq.PULL)
    sock.set_hwm(0)  # High Water Mark: не терять пакеты при пиковых нагрузках

    try:
        sock.bind(zmq_url)
        logger.info(f"[ZMQ] Приемник на {zmq_url} запущен")
    except Exception as e:
        logger.error(f"[ZMQ] Bind Error: {e}")
        return

    while True:
        try:
            packet = await sock.recv()
            if packet:
                await zmq_message_dispatcher(packet, connections)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[ZMQ] Loop Error: {e}")
            await asyncio.sleep(0.01)

    sock.close()
    ctx.term()