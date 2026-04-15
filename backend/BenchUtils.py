# backend\BenchUtils.py
import asyncio, time, logs.LoggerWrapper as logger

_total = 0

def add_bytes(n): 
    global _total; _total += n

async def _print_stats(interval=1):
    global _total
    prev, last = 0, time.perf_counter()
    while True:
        await asyncio.sleep(interval)
        elapsed = (now := time.perf_counter()) - last
        if (new := _total - prev) > 0:
            mbps = (new * 8) / (elapsed * 1024 * 1024)
            size = f"{new} B" if new < 1024 else f"{new/1024:.1f} KB" if new < 1048576 else f"{new/1048576:.2f} MB"
            logger.Log.info(f"[BENCH] {size} | {elapsed:.2f}s | {mbps:.2f} Mbit/s")
        prev, last = _total, now

def start_benchmark(loop, interval=1): 
    loop.create_task(_print_stats(interval))