import asyncio
import multiprocessing
import zmq
import zmq.asyncio
from LoggerWrapper import Log as logger
from Config import IP, PORT, NUM_WORKERS
from .ClientConnection import client_handler
from UI import operator_interface
from .Worker import module_worker
from BenchUtils import add_bytes, start_benchmark


async def start_server():
    log_queue = multiprocessing.Queue()
    zmq_ctx = zmq.asyncio.Context()

    # --- Общий PUSH-сокет для всех клиентов ---
    push_socket = zmq_ctx.socket(zmq.PUSH)
    push_socket.bind(f"tcp://{IP}:5555")
    push_socket.set_hwm(0)  # Без ограничений на очередь
    logger.info(f"[+] ZeroMQ PUSH socket bound to tcp://{IP}:5555")

    # --- TCP сервер ---
    server = await asyncio.start_server(
        lambda r, w: client_handler(r, w, push_socket),
        IP,
        PORT,
        reuse_address=True,
        backlog=1000
    )
    addr = server.sockets[0].getsockname()
    logger.info(f"[+] Server started on {addr}")

    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))

    # --- Запуск воркеров ---
    process_list = []
    for _ in range(NUM_WORKERS):
        p = multiprocessing.Process(target=module_worker, args=(log_queue,))
        p.start()
        process_list.append(p)
    logger.info(f"[+] {NUM_WORKERS} worker processes started")

    # --- Интерфейс оператора ---
    operator_task = asyncio.create_task(operator_interface(server))

    start_benchmark(asyncio.get_running_loop(), interval=1)

    async with server:
        try:
            await asyncio.gather(server.serve_forever(), operator_task, log_task)
        except asyncio.CancelledError as e:
            logger.info(f"[*] asyncio.CancelledError: {e}")
        finally:
            for p in process_list:
                p.terminate()
                p.join()
            logger.info("[*] All workers terminated")

            log_queue.put("STOP")
            await log_task

            push_socket.close()
            zmq_ctx.term()
            logger.info("[*] ZeroMQ context terminated")
