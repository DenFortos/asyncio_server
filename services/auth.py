import asyncio
import json
from loguru import logger
from config import AUTH_KEY

MAX_PAYLOAD = 64 * 1024

async def authorize_client(reader: asyncio.StreamReader):
    try:
        name_len_bytes = await asyncio.wait_for(reader.readexactly(1), timeout=10)
        name_len = name_len_bytes[0]
        module_name = (await asyncio.wait_for(reader.readexactly(name_len), timeout=10)).decode("utf-8")

        payload_len_bytes = await asyncio.wait_for(reader.readexactly(4), timeout=10)
        payload_len = int.from_bytes(payload_len_bytes, byteorder="big")

        if payload_len > MAX_PAYLOAD:
            logger.info("[!] Authorize - payload too big")
            return None, None

        payload_bytes = await asyncio.wait_for(reader.readexactly(payload_len), timeout=10)

        if module_name != 'AuthModule':
            logger.info('[!] Authorize - error module name')
            return None, None

        payload = json.loads(payload_bytes.decode('utf-8'))

        if payload.get('auth_key') != AUTH_KEY:
            logger.info('[!] Authorize - error auth key')
            return None, None

        client_id = payload.get('client_id')
        if not isinstance(client_id, str):
            logger.info('[!] Authorize - error client_id')
            return None, None

        info = payload.get('info', {})
        if not isinstance(info, dict):
            logger.info('[!] Authorize - error info')
            return None, None

        return client_id, info

    except (asyncio.TimeoutError, asyncio.IncompleteReadError):
        logger.info('[!] Authorize - connection error')
        return None, None
    except UnicodeDecodeError:
        logger.info('[!] Authorize - decode error')
        return None, None
    except json.JSONDecodeError:
        logger.info('[!] Authorize - invalid JSON')
        return None, None
    except Exception as e:
        logger.info(f'[!] Authorize - unknown error: {e}')
        return None, None