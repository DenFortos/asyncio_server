# backend/API/ZmqDispatcher.py (ИСПРАВЛЕННЫЙ для БИНАРНОГО протокола и ДИАГНОСТИКИ)

import asyncio
import json
import zmq
import zmq.asyncio
import struct
from typing import Set, Optional, Dict, Any
from fastapi import WebSocket
from logs import Log as logger


# ----------------------------------------------------------------------
# Функция кодирования
# ----------------------------------------------------------------------

def encode_to_binary_protocol(client_id: str, module_name: str, payload_bytes: bytes) -> bytes:
    """
    Кодирует данные в требуемый бинарный формат для отправки на фронтенд.
    Формат: ID_len (1) | ID (N) | Mod_len (1) | Module_name (N) | Payload_len (4) | Payload (N)
    """
    id_bytes = client_id.encode('utf-8', errors='replace')
    module_bytes = module_name.encode('utf-8', errors='replace')

    header = struct.pack('B', len(id_bytes)) + id_bytes
    header += struct.pack('B', len(module_bytes)) + module_bytes
    header += struct.pack('>I', len(payload_bytes))

    return header + payload_bytes


# ----------------------------------------------------------------------
# Основной диспетчер
# ----------------------------------------------------------------------

async def zmq_message_dispatcher(
        header_bytes: bytes,
        payload_bytes: Optional[bytes],
        websocket_connections: Set[WebSocket]
):
    """
    Обрабатывает ZMQ-сообщение (Multipart) и рассылает его ВСЕГДА в унифицированном
    бинарном формате (ID_len|...|Payload) всем активным WebSocket-соединениям.
    """

    # 1. Парсинг заголовка
    try:
        header: Dict[str, Any] = json.loads(header_bytes.decode('utf-8'))
        module_name = header.get("module", "Unknown")
        client_id = header.get("client_id", "?")
    except json.JSONDecodeError:
        logger.error(f"[ZMQ Dispatch] Failed to decode ZMQ header. Raw bytes: {header_bytes[:50]}...")
        return

    payload_len = len(payload_bytes) if payload_bytes is not None else 0

    # 🚨 КРИТИЧЕСКИЙ ДИАГНОСТИЧЕСКИЙ ЛОГ 🚨
    logger.info(
        f"[ZMQ Dispatcher IN] ID: {client_id} | Module: {module_name} | Payload Size: {payload_len} bytes. WS connections: {len(websocket_connections)}"
    )

    # 2. Определение итоговой полезной нагрузки
    final_payload_bytes = payload_bytes if payload_bytes is not None else b''

    # 3. Кодирование в новый бинарный протокол (УНИФИКАЦИЯ)
    try:
        encoded_message = encode_to_binary_protocol(client_id, module_name, final_payload_bytes)
        logger.debug(f"[ZMQ Dispatcher] Successfully encoded message for frontend.")
    except Exception as e:
        logger.error(f"[ZMQ Dispatch] Failed to encode to binary protocol: {e}")
        return

    # 4. Рассылка бинарного фрейма
    if not websocket_connections:
        logger.warning("[ZMQ Dispatcher] No active WebSocket connections to send message to.")
        return

    for ws in list(websocket_connections):
        try:
            await ws.send_bytes(encoded_message)
            logger.debug(f"[ZMQ Dispatcher] Sent {len(encoded_message)} bytes to a WebSocket client.")
        except Exception as e:
            logger.error(f"[ZMQ Dispatcher] Error sending to WebSocket: {type(e).__name__}. Removing connection.")
            websocket_connections.discard(ws)  # Автоматически удаляем битое соединение


# ----------------------------------------------------------------------
# Цикл приема ZMQ
# ----------------------------------------------------------------------

async def zmq_pull_task_loop(websocket_connections: Set[WebSocket], ZMQ_WORKER_PUSH_API: str):
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = None

    try:
        pull_socket = zmq_ctx.socket(zmq.PULL)
        pull_socket.set_hwm(0)

        # Используем connect() вместо bind() если API запускается после Server.py
        # pull_socket.connect(ZMQ_WORKER_PUSH_API)

        # Используем bind() как было изначально (предполагаем, что Server.py стартует позже)
        pull_socket.bind(ZMQ_WORKER_PUSH_API)

        logger.info(f"[ZMQ Dispatch] [+] ZeroMQ PULL socket bound to {ZMQ_WORKER_PUSH_API}")

        while True:
            try:
                # 🚨 КРИТИЧЕСКИЙ ЛОГ ПЕРЕД ОЖИДАНИЕМ 🚨
                logger.debug("[ZMQ Dispatch] Waiting for next ZMQ message...")

                frames = await pull_socket.recv_multipart()

                # 🚨 КРИТИЧЕСКИЙ ЛОГ ПОСЛЕ ПОЛУЧЕНИЯ 🚨
                logger.debug(f"[ZMQ Dispatch] Received ZMQ message with {len(frames)} frames.")

                if not frames:
                    continue

                header = frames[0]
                payload = frames[1] if len(frames) > 1 else None

                await zmq_message_dispatcher(header, payload, websocket_connections)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[ZMQ Dispatch] [!] ZMQ PULL task inner loop error: {e}")
                await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.critical(f"[ZMQ Dispatch] [!!!] ZMQ PULL task FATAL error: {e}")
    finally:
        if pull_socket:
            pull_socket.close()
        zmq_ctx.term()
        logger.info("[ZMQ Dispatch] [*] ZMQ PULL context terminated.")

