# bench_utils.py
import asyncio
import time
from LoggerWrapper import Log as logger

# глобальные счётчики
_total_bytes = 0
_start_time = None


def add_bytes(n: int):
    """Вызывается из client_handler при получении чанка"""
    global _total_bytes, _start_time
    if _start_time is None:
        _start_time = time.time()
    _total_bytes += n


async def _print_stats(interval: int = 1):
    """Фоновая задача для печати статистики только при наличии трафика"""
    global _total_bytes, _start_time
    prev_bytes = 0
    prev_time = time.time()

    while True:
        await asyncio.sleep(interval)
        now = time.time()
        elapsed = now - prev_time
        if elapsed <= 0:
            continue

        new_bytes = _total_bytes - prev_bytes
        if new_bytes == 0:
            # нет трафика — не спамим
            continue

        mbps = (new_bytes * 8) / (elapsed * 1024 * 1024)
        logger.info(f"[BENCH] {new_bytes} bytes in {elapsed:.2f}s -> {mbps:.2f} Mbit/s")

        prev_bytes = _total_bytes
        prev_time = now


def start_benchmark(loop: asyncio.AbstractEventLoop, interval: int = 1):
    """Запускает задачу в event loop для печати статистики"""
    loop.create_task(_print_stats(interval))
