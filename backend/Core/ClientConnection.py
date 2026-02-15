import asyncio
from logs import Log as logger
from backend.Services import authorize_client, close_client, client, client_info, fsmap
from backend.BenchUtils import add_bytes

"""
Читает данные по бинарному протоколу и возвращает ID и готовый пакет.
[ID_len][ID][Mod_len][Mod][Pay_len][Payload]
"""

async def read_full_packet(reader: asyncio.StreamReader):
    try:
        # 1. Читаем длину ID
        header_id = await reader.readexactly(1)
        id_len = header_id[0]
        id_bytes = await reader.readexactly(id_len)

        # 2. Читаем длину модуля
        header_mod = await reader.readexactly(1)
        mod_len = header_mod[0]
        mod_bytes = await reader.readexactly(mod_len)

        # 3. Читаем длину Payload
        header_pay_len = await reader.readexactly(4)
        pay_len = int.from_bytes(header_pay_len, byteorder="big")

        # 4. Читаем Payload
        payload = await reader.readexactly(pay_len)

        # Склеиваем всё в один пакет для ZMQ
        full_packet = header_id + id_bytes + header_mod + mod_bytes + header_pay_len + payload
        return id_bytes.decode(errors='ignore'), full_packet
    except asyncio.IncompleteReadError:
        return None, None
    except Exception as e:
        logger.debug(f"Read error: {e}")
        return None, None


async def client_handler(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, push_socket):
    client_id = None
    addr = writer.get_extra_info("peername")
    ip_address = addr[0]

    try:
        # 1. АВТОРИЗАЦИЯ
        auth_result = await authorize_client(reader, ip_address)
        if not auth_result:
            try:
                writer.close()
                await writer.wait_closed()
            except:
                pass
            return

        client_id, payload_dict = auth_result
        if client_id in client:
            await close_client(client_id, send_sleep=False)

        client_info[client_id] = payload_dict
        client[client_id] = (reader, writer)
        logger.info(f"[+] Клиент {client_id} подключен: {addr}")

        # 2. ЦИКЛ ПЕРЕСЫЛКИ
        while True:
            inc_id, packet = await read_full_packet(reader)
            if not packet: break

            if inc_id != client_id:
                logger.warning(f"ID Mismatch: {inc_id} != {client_id}")
                continue

            add_bytes(len(packet))
            await push_socket.send(packet)

    except (ConnectionResetError, ConnectionAbortedError):
        # Подавляем WinError 10054 (Бот закрыл соединение)
        pass
    except Exception as e:
        logger.error(f"Ошибка в handler {client_id}: {e}")
    finally:
        # Очистка реестра
        if client_id:
            client.pop(client_id, None)
            client_info.pop(client_id, None)
            fsmap.pop(client_id, None)

        # Безопасное закрытие сокета
        try:
            if not writer.is_closing():
                writer.close()
            # Пытаемся подождать закрытия, игнорируя ошибки "уже закрытого" сокета
            await asyncio.wait_for(writer.wait_closed(), timeout=2.0)
        except (ConnectionResetError, OSError, asyncio.TimeoutError):
            pass
        except Exception as e:
            logger.debug(f"Socket close detail for {client_id}: {e}")

        logger.info(f"[-] Клиент {client_id or '?'} отключен.")