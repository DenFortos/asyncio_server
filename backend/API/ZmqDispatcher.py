import asyncio
import zmq
import zmq.asyncio
from typing import Set
from fastapi import WebSocket
from logs import Log as logger


# ----------------------------------------------------------------------
# Основной диспетчер
# ----------------------------------------------------------------------

async def zmq_message_dispatcher(
        packet: bytes,
        websocket_connections: Set[WebSocket]
):
    """
    Принимает готовый бинарный пакет от воркера и транслирует его в WebSocket.
    """
    if not packet:
        return

    # 1. МИНИ-РАЗБОР ДЛЯ МАРШРУТИЗАЦИИ
    try:
        # Нам нужно только узнать client_id, чтобы понимать, чей это бот
        id_len = packet[0]
        client_id_bytes = packet[1: 1 + id_len]
        client_id = client_id_bytes.decode('utf-8', errors='ignore')

        # Для диагностики вытащим и имя модуля (оно идет сразу после ID)
        mod_len_pos = 1 + id_len
        mod_len = packet[mod_len_pos]
        module_name = packet[mod_len_pos + 1: mod_len_pos + 1 + mod_len].decode('utf-8', errors='ignore')

    except Exception as e:
        logger.error(f"[ZMQ Dispatch] Ошибка разбора заголовка: {e}")
        return

    # 🚨 ДИАГНОСТИЧЕСКИЙ ЛОГ 🚨
    logger.info(
        f"[ZMQ -> WS] Client: {client_id} | Module: {module_name} | Total Size: {len(packet)} bytes"
    )

    # 2. РАССЫЛКА ПАКЕТА
    if not websocket_connections:
        logger.warning("[ZMQ Dispatcher] Нет активных WS-соединений.")
        return

    # Отправляем ВЕСЬ пакет без изменений (Zero-copy трансляция)
    for ws in list(websocket_connections):
        try:
            await ws.send_bytes(packet)
        except Exception as e:
            logger.error(f"[ZMQ Dispatcher] Ошибка отправки в WS: {e}")
            websocket_connections.discard(ws)


# ----------------------------------------------------------------------
# Цикл приема ZMQ
# ----------------------------------------------------------------------

async def zmq_pull_task_loop(websocket_connections: Set[WebSocket], ZMQ_WORKER_PUSH_API: str):
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = None

    try:
        pull_socket = zmq_ctx.socket(zmq.PULL)
        # Убираем лимиты очереди, чтобы не терять пакеты
        pull_socket.set_hwm(0)

        # Привязываемся к адресу
        pull_socket.bind(ZMQ_WORKER_PUSH_API)

        logger.info(f"[ZMQ Dispatch] [+] PULL socket bound to {ZMQ_WORKER_PUSH_API}")

        while True:
            try:
                # Воркер теперь присылает ОДИН фрейм вместо multipart
                packet = await pull_socket.recv()

                # Пробрасываем в диспетчер
                await zmq_message_dispatcher(packet, websocket_connections)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[ZMQ Dispatch] Ошибка в цикле приема: {e}")
                await asyncio.sleep(0.01)

    except Exception as e:
        logger.critical(f"[ZMQ Dispatch] Фатальная ошибка: {e}")
    finally:
        if pull_socket:
            pull_socket.close()
        zmq_ctx.term()
        logger.info("[ZMQ Dispatch] Контекст завершен.")