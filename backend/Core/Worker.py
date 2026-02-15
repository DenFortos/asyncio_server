# backend/Core/Worker.py
import asyncio
import json
import zmq
import zmq.asyncio
import multiprocessing
from logs import Log as logger
from backend import ZMQ_CLIENT_PUSH_WORKER, ZMQ_WORKER_PUSH_API


# backend/Core/Worker.py
async def worker_task(worker_id: str):
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = zmq_ctx.socket(zmq.PULL)
    pull_socket.connect(ZMQ_CLIENT_PUSH_WORKER)
    push_to_api_socket = zmq_ctx.socket(zmq.PUSH)
    push_to_api_socket.connect(ZMQ_WORKER_PUSH_API)

    from backend.Modules import module_map
    logger.info(f"[+] Worker {worker_id} запущен (Fast Pipeline)")

    while True:
        try:
            packet = await pull_socket.recv()
            if not packet: continue

            # --- БЫСТРЫЙ ПАРСИНГ ИМЕНИ МОДУЛЯ ---
            cursor = 0
            id_len = packet[cursor];
            cursor += 1 + id_len
            mod_len = packet[cursor]
            module_name = packet[cursor + 1: cursor + 1 + mod_len].decode('utf-8', errors='ignore')
            cursor += 1 + mod_len
            header_end_pos = cursor  # Позиция перед полем Pay_Len (4 байта)

            # --- FAST PATH ДЛЯ СТРИМИНГА ---
            # Если это ScreenWatch, просто кидаем пакет в API как есть
            if module_name == "ScreenWatch":
                await push_to_api_socket.send(packet)
                continue

            # --- ОБЫЧНЫЙ ПУТЬ ДЛЯ JSON КОМАНД (DataScribe и т.д.) ---
            pay_len = int.from_bytes(packet[cursor: cursor + 4], 'big')
            payload_data = packet[cursor + 4: cursor + 4 + pay_len]

            func = module_map.get(module_name)
            if not func: continue

            # Подготовка данных (JSON для системных, байты для остальных)
            input_data = json.loads(payload_data.decode()) if module_name == "DataScribe" else payload_data

            # Выполнение
            result = await asyncio.to_thread(func, input_data)

            if result is not None:
                res_bytes = json.dumps(result).encode() if module_name == "DataScribe" else result
                res_len_b = len(res_bytes).to_bytes(4, 'big')
                # Пересборка пакета с новым результатом
                final_packet = packet[0: header_end_pos] + res_len_b + res_bytes
                await push_to_api_socket.send(final_packet)

        except Exception as e:
            logger.error(f"[Worker {worker_id}] Error: {e}")

    push_to_api_socket.close()
    pull_socket.close()
    zmq_ctx.term()


def module_worker(log_queue):
    """ Точка входа для multiprocessing.Process """
    worker_id = multiprocessing.current_process().name
    logger.for_worker(log_queue)
    asyncio.run(worker_task(worker_id))