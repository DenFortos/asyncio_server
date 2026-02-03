import asyncio
import zmq.asyncio
from typing import Dict
from logs import Log as logger


async def zmq_message_dispatcher(packet: bytes, connections: Dict[str, dict]):
    """Парсит бинарный пакет и рассылает его разрешенным WebSocket-клиентам."""
    if not packet or not connections: return

    try:
        # 1. Быстрый парсинг заголовка
        id_len = packet[0]
        bot_id = packet[1:1 + id_len].decode('utf-8', errors='ignore')

        mod_idx = 1 + id_len
        mod_len = packet[mod_idx]
        mod_name = packet[mod_idx + 1: mod_idx + 1 + mod_len].decode('utf-8', errors='ignore')

        bot_prefix = bot_id.split('-')[0]

        if mod_name == "DataScribe":
            logger.info(f"[ZMQ] DataScribe от {bot_id} -> Рассылка ({len(connections)} сессий)")

    except Exception as e:
        return logger.error(f"[ZMQ] Ошибка структуры пакета: {e}")

    # 2. Рассылка с проверкой прав
    for login, session in connections.items():
        role, prefix = session.get("role"), session.get("prefix")

        # Условие доступа
        if role == "admin" or prefix == "ALL" or prefix == bot_prefix:
            for ws in session.get("sockets", []):
                asyncio.create_task(safe_send(ws, packet))
        elif mod_name == "DataScribe":
            logger.warning(f"[ZMQ] Доступ запрещен для {login} (бот: {bot_id})")


async def safe_send(ws, packet: bytes):
    """Безопасная асинхронная отправка."""
    try:
        await ws.send_bytes(packet)
    except:
        pass  # Очистка сокетов происходит в ConnectionManager


async def zmq_pull_task_loop(connections: Dict[str, dict], zmq_url: str):
    """Цикл прослушивания шины ZMQ (PULL)."""
    ctx = zmq.asyncio.Context()
    sock = ctx.socket(zmq.PULL)
    sock.set_hwm(0)  # Не ограничивать очередь входящих

    try:
        sock.bind(zmq_url)
        logger.info(f"[ZMQ] Receiver active on {zmq_url}")
    except Exception as e:
        return logger.error(f"[ZMQ] Bind error: {e}")

    while True:
        try:
            packet = await sock.recv()
            if packet:
                await zmq_message_dispatcher(packet, connections)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[ZMQ] Loop error: {e}")
            await asyncio.sleep(0.01)

    sock.close();
    ctx.term()