import asyncio
import time
from logs.LoggerWrapper import Log as logger

_total_bytes = 0


def add_bytes(n: int):
    global _total_bytes
    _total_bytes += n


async def _print_stats(interval: int = 1):
    global _total_bytes
    prev_bytes = 0
    # Фиксируем время ровно перед началом цикла
    last_check_time = time.perf_counter()

    while True:
        await asyncio.sleep(interval)

        # Используем perf_counter для сверхточных замеров времени
        now = time.perf_counter()
        elapsed = now - last_check_time

        current_total = _total_bytes
        new_bytes = current_total - prev_bytes

        if new_bytes > 0:
            # (Байты * 8 бит) / (секунды * 1024 * 1024) = Mbit/s
            mbps = (new_bytes * 8) / (elapsed * 1024 * 1024)

            # Если байт мало (меньше 1 КБ), пишем в байтах, если много — в КБ или МБ
            if new_bytes < 1024:
                size_str = f"{new_bytes} B"
            elif new_bytes < 1024 * 1024:
                size_str = f"{new_bytes / 1024:.1f} KB"
            else:
                size_str = f"{new_bytes / (1024 * 1024):.2f} MB"

            logger.info(f"[BENCH] {size_str} in {elapsed:.2f}s -> {mbps:.2f} Mbit/s")

        prev_bytes = current_total
        last_check_time = now


def start_benchmark(loop: asyncio.AbstractEventLoop, interval: int = 1):
    loop.create_task(_print_stats(interval))