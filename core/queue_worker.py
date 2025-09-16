import socket
import multiprocessing
from loguru import logger

from modules import *

module_queue = multiprocessing.Queue()

def module_worker():
    logger.info(f"[+] module_worker {multiprocessing.current_process().name} started")

    while True:
        try:
            # Получаем задачу из очереди
            client_id, name_len, payload_len, fd = module_queue.get()

            # Воссоздаём сокет из файлового дескриптора
            sock = socket.fromfd(fd, socket.AF_INET, socket.SOCK_STREAM)
            sock.setblocking(True)  # блокирующее чтение для воркера

            # --- Чтение module_name ---
            module_name_bytes = b''
            while len(module_name_bytes) < name_len:
                chunk = sock.recv(name_len - len(module_name_bytes))
                if not chunk:
                    raise ConnectionError("Socket closed while reading module_name")
                module_name_bytes += chunk
            module_name = module_name_bytes.decode("utf-8")

            # --- Чтение payload_bytes ---
            payload_bytes = b''
            while len(payload_bytes) < payload_len:
                chunk = sock.recv(payload_len - len(payload_bytes))
                if not chunk:
                    raise ConnectionError(f"Socket closed while reading payload for {module_name}")
                payload_bytes += chunk

            logger.info(f"[+] Client {client_id} → module '{module_name}' ({payload_len} bytes)")

            # --- Вызов соответствующей функции ---
            func = module_map.get(module_name)
            if func:
                try:
                    func(payload_bytes)
                except Exception as e:
                    logger.error(f"[{module_name}] Error processing payload: {e}")
            else:
                logger.warning(f"[!] Unknown module '{module_name}' from client {client_id}")

        except Exception as e:
            logger.error(f"[module_worker] General error: {e}")