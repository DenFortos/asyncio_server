# backend/BenchUtils.py

import asyncio
from typing import List

import backend.LoggerWrapper as logger

REPORT_INTERVAL_SECONDS: int = 1

_total_bytes_count: int = 0


def add_bytes(byte_count: int) -> None:
    """
    Увеличение глобального счетчика переданных байт.
    """
    global _total_bytes_count
    _total_bytes_count += byte_count


async def _print_statistics() -> None:
    """
    Расчет и вывод нагрузки на сервер за произвольный период.
    Вывод подавляется, если нагрузка за период равна 0.
    
    Data Scheme:
    Total = Сумма байт за весь период REPORT_INTERVAL_SECONDS.
    Avg = Среднеарифметическая нагрузка (Байт/Сек) за этот период.
    """
    global _total_bytes_count
    previous_total_bytes: int = 0

    while True:
        await asyncio.sleep(REPORT_INTERVAL_SECONDS)

        current_total_snapshot: int = _total_bytes_count
        
        bytes_in_period: int = current_total_snapshot - previous_total_bytes
        previous_total_bytes = current_total_snapshot

        if bytes_in_period > 0:
            average_bytes_per_second: float = bytes_in_period / REPORT_INTERVAL_SECONDS
            megabits_per_second: float = (average_bytes_per_second * 8) / (1024 * 1024)

            logger.Log.info(
                f"[BENCHMARK] Period: {REPORT_INTERVAL_SECONDS}s | "
                f"Total: {bytes_in_period} B | "
                f"Avg: {average_bytes_per_second:.1f} B/s | "
                f"{megabits_per_second:.2f} Mbit/s"
            )


def start_benchmark(event_loop: asyncio.AbstractEventLoop) -> None:
    """
    Запуск фоновой задачи мониторинга сетевой активности.
    """
    event_loop.create_task(_print_statistics())