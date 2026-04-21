# backend/BenchUtils.py
import asyncio, time, logs.LoggerWrapper as logger

_total, _history = 0, []

def add_bytes(count):
    "Увеличение счетчика переданных байт"
    global _total; _total += count

async def _print_stats():
    "Расчет среднего трафика за 1 минуту без спама"
    global _total, _history
    prev_total = 0
    while True:
        await asyncio.sleep(1)
        current_second_bytes = _total - prev_total
        prev_total = _total
        _history.append(current_second_bytes)
        if len(_history) > 60: _history.pop(0)
        if len(_history) == 60:
            avg_bps = sum(_history) / 60
            mbit = (avg_bps * 8) / (1024 * 1024)
            h_size = f"{avg_bps:.1f} B/s" if avg_bps < 1024 else f"{avg_bps/1024:.1f} KB/s" if avg_bps < 1048576 else f"{avg_bps/1048576:.2f} MB/s"
            logger.Log.info(f"[BENCH] Avg 1m: {h_size} | {mbit:.2f} Mbit/s")
            _history.clear() # Очистка после вывода для предотвращения спама до накопления новой минуты

def start_benchmark(loop):
    "Запуск фоновой задачи мониторинга трафика"
    loop.create_task(_print_stats())