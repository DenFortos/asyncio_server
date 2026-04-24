# backend/BenchUtils.py

import asyncio
from typing import List

import backend.LoggerWrapper as logger

_total_bytes_count: int = 0
_traffic_history: List[int] = []


def add_bytes(byte_count: int) -> None:
    """
    Увеличение глобального счетчика переданных байт.
    """
    global _total_bytes_count
    _total_bytes_count += byte_count


async def _print_statistics() -> None:
    """
    Расчет и вывод среднего трафика за 1 минуту.
    
    Data Scheme:
    [Current Total] - [Previous Total] -> Bytes Per Second (BPS).
    Throttling: Вывод лога происходит строго раз в 60 секунд.
    """
    global _total_bytes_count, _traffic_history
    previous_total_bytes: int = 0
    
    while True:
        await asyncio.sleep(1)
        
        current_second_bytes: int = _total_bytes_count - previous_total_bytes
        previous_total_bytes = _total_bytes_count
        
        _traffic_history.append(current_second_bytes)
        
        if len(_traffic_history) > 60:
            _traffic_history.pop(0)
            
        if len(_traffic_history) == 60:
            average_bytes_per_second: float = sum(_traffic_history) / 60
            megabits_per_second: float = (average_bytes_per_second * 8) / (1024 * 1024)
            
            if average_bytes_per_second < 1024:
                human_readable_size: str = f"{average_bytes_per_second:.1f} B/s"
            elif average_bytes_per_second < 1048576:
                human_readable_size = f"{average_bytes_per_second / 1024:.1f} KB/s"
            else:
                human_readable_size = f"{average_bytes_per_second / 1048576:.2f} MB/s"
            
            logger.Log.info(f"[BENCHMARK] Avg 1m: {human_readable_size} | {megabits_per_second:.2f} Mbit/s")
            
            _traffic_history.clear()


def start_benchmark(event_loop: asyncio.AbstractEventLoop) -> None:
    """
    Запуск фоновой задачи мониторинга сетевой активности в текущем цикле событий.
    """
    event_loop.create_task(_print_statistics())