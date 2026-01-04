# backend/API/ZmqDispatcher.py (ИСПРАВЛЕННЫЙ для БИНАРНОГО протокола)

import asyncio
import json
import zmq
import zmq.asyncio
import struct
from typing import Set, Optional, Dict, Any
from fastapi import WebSocket
from logs import Log as logger


# ----------------------------------------------------------------------
# Функция кодирования (ОСТАВЛЕНА, так как используется для фронтенда)
# ----------------------------------------------------------------------

def encode_to_binary_protocol(client_id: str, module_name: str, payload_bytes: bytes) -> bytes:
    """
    Кодирует данные в требуемый бинарный формат для отправки на фронтенд.
    Формат: ID_len (1) | ID (N) | Mod_len (1) | Module_name (N) | Payload_len (4) | Payload (N)
    """
    id_bytes = client_id.encode('utf-8', errors='replace')
    module_bytes = module_name.encode('utf-8', errors='replace')

    # 1. ID_len и ID
    header = struct.pack('B', len(id_bytes)) + id_bytes

    # 2. Mod_len и Module_name
    header += struct.pack('B', len(module_bytes)) + module_bytes

    # 3. Payload_len (4 байта, Big Endian)
    header += struct.pack('>I', len(payload_bytes))

    # 4. Соединяем заголовок и полезную нагрузку
    return header + payload_bytes


# ----------------------------------------------------------------------
# Основной диспетчер
# ----------------------------------------------------------------------

# backend/API/ZmqDispatcher.py (ФУНКЦИЯ)

import json
from typing import Set, Optional, Dict, Any
from fastapi import WebSocket


# Предполагаем, что logger и encode_to_binary_protocol импортированы
# from logs import Log as logger
# from .ZmqEncoder import encode_to_binary_protocol


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
        logger.error(f"[ZMQ Dispatch] Failed to decode ZMQ header.")
        return

    # 🚨 КРИТИЧЕСКИЙ ДИАГНОСТИЧЕСКИЙ ЛОГ 🚨
    # Показывает, какие данные (ID, Модуль, Размер) диспетчер получил из ZMQ.
    payload_len = len(payload_bytes) if payload_bytes is not None else 0
    logger.info(
        f"[ZMQ Dispatcher IN] ID: {client_id} | Module: {module_name} | Payload Size: {payload_len} bytes"
    )

    # 2. Определение итоговой полезной нагрузки
    # final_payload_bytes - это то, что пришло во втором фрейме (например, JSON-байты AuthUpdate)
    final_payload_bytes = payload_bytes if payload_bytes is not None else b''

    # 3. Кодирование в новый бинарный протокол (УНИФИКАЦИЯ)
    try:
        # Используем функцию для создания бинарного пакета для фронтенда
        encoded_message = encode_to_binary_protocol(client_id, module_name, final_payload_bytes)
    except Exception as e:
        logger.error(f"[ZMQ Dispatch] Failed to encode to binary protocol: {e}")
        return

    # 4. Рассылка бинарного фрейма
    for ws in list(websocket_connections):
        try:
            # Отправляем ВСЁ как единый бинарный фрейм WebSocket
            await ws.send_bytes(encoded_message)
        except Exception:
            # Тихая обработка отключений WebSocket
            pass


# ----------------------------------------------------------------------
# Цикл приема ZMQ
# ----------------------------------------------------------------------

async def zmq_pull_task_loop(websocket_connections: Set[WebSocket], ZMQ_WORKER_PUSH_API: str):
    """
    Основной цикл для приема всех ZMQ-сообщений (статус и результаты)
    и передачи их в диспетчер.
    """
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = None

    try:
        pull_socket = zmq_ctx.socket(zmq.PULL)
        pull_socket.set_hwm(0)
        pull_socket.bind(ZMQ_WORKER_PUSH_API)

        logger.info(f"[ZMQ Dispatch] [+] ZeroMQ PULL socket bound to {ZMQ_WORKER_PUSH_API}")

        while True:
            try:
                # 1. Прием сообщения (ожидаем ZMQ Multipart [Header] [Payload] )
                frames = await pull_socket.recv_multipart()
                if not frames:
                    continue

                # 2. Извлечение Header и Payload
                header = frames[0]
                # Payload - это второй фрейм, если он есть.
                payload = frames[1] if len(frames) > 1 else None

                # 3. Прямая передача в диспетчер
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