import asyncio
import zmq.asyncio
from typing import Dict
from logs import Log as logger


async def zmq_message_dispatcher(packet: bytes, connections: Dict[str, dict]):
    """Разбирает бинарный пакет и рассылает его активным сессиям (WebSocket)."""
    if not packet or not connections:
        return

    try:
        # 1. Парсинг заголовка (ID и Модуль)
        id_len = packet[0]
        bot_id = packet[1: 1 + id_len].decode('utf-8', errors='ignore')

        mod_offset = 1 + id_len
        mod_len = packet[mod_offset]
        module_name = packet[mod_offset + 1: mod_offset + 1 + mod_len].decode('utf-8', errors='ignore')

        # Префикс для проверки прав (например, из 'u80a9-Bot' берем 'u80a9')
        bot_prefix = bot_id.split('-')[0]

        # ЛОГ ДЛЯ ОТЛАДКИ: видим, что пакет вообще долетел до API из ZMQ
        if module_name == "DataScribe":
            logger.info(f"[ZMQ] Получен DataScribe от {bot_id}. Рассылка активным сессиям: {len(connections)}")

    except Exception as e:
        logger.error(f"[ZMQ] Ошибка парсинга бинарного пакета: {e}")
        return

    # 2. Рассылка по активным сессиям
    found_target = False
    for login, session in list(connections.items()):
        # Проверка прав: Admin, префикс ALL или совпадение префикса бота
        is_allowed = (
                session.get("role") == "admin" or
                session.get("prefix") == "ALL" or
                session.get("prefix") == bot_prefix
        )

        if is_allowed:
            sockets = session.get("sockets", [])
            if sockets:
                found_target = True
                for ws in sockets:
                    # Используем create_task, чтобы не блокировать диспетчер
                    asyncio.create_task(safe_send(ws, packet))
        else:
            # Если пакет пришел, но права не совпали
            if module_name == "DataScribe":
                logger.warning(f"[ZMQ] Отказ в пересылке для {login}: не совпадает префикс/роль")

    if not found_target:
        # Важный лог: пакет пришел от бота, но в API нет подходящего WebSocket-клиента
        logger.debug(f"[ZMQ] Нет активного получателя для {bot_id} [{module_name}]")


async def safe_send(ws, packet: bytes):
    """Безопасная отправка в WebSocket."""
    try:
        # FastAPI WebSocket требует bytes для бинарной отправки
        await ws.send_bytes(packet)
    except Exception:
        # Ошибки закрытых сокетов чистятся в ConnectionManager.disconnect
        pass


async def zmq_pull_task_loop(connections: Dict[str, dict], zmq_url: str):
    """Основной цикл прослушивания шины ZMQ (Worker -> API)."""
    ctx = zmq.asyncio.Context()
    sock = ctx.socket(zmq.PULL)
    sock.set_hwm(0)

    try:
        sock.bind(zmq_url)
        logger.info(f"[ZMQ] Приемник API запущен на {zmq_url}")
    except Exception as e:
        logger.error(f"[ZMQ] Ошибка Bind (возможно порт занят): {e}")
        return

    while True:
        try:
            packet = await sock.recv()
            if packet:
                await zmq_message_dispatcher(packet, connections)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[ZMQ] Ошибка в цикле PULL: {e}")
            await asyncio.sleep(0.01)

    sock.close()
    ctx.term()