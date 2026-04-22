# backend/Core/network.py
import json, asyncio, logs.LoggerWrapper as logger

async def read_packet(reader):
    try:
        # 1. Читаем заголовок (6 байт)
        header = await reader.readexactly(6)
        l1, l2, l3 = header[0], header[1], int.from_bytes(header[2:6], "big")
        
        # 2. Читаем тело (L1 + L2 + L3)
        body = await reader.readexactly(l1 + l2 + l3)
        
        bot_id = body[:l1].decode(errors='ignore')
        module = body[l1 : l1+l2].decode(errors='ignore')
        raw_pay = body[l1+l2:]
        
        # 3. Десериализация (Твой "черный ящик")
        try: payload = json.loads(raw_pay.decode())
        except:
            try: payload = raw_pay.decode()
            except: payload = raw_pay
            
        return bot_id, module, payload
    except Exception:
        return None, None, None

def pack_packet(bot_id, module, payload):
    """Сборка кадра для отправки боту"""
    try:
        if isinstance(payload, (dict, list)): payload = json.dumps(payload, separators=(',', ':')).encode()
        elif isinstance(payload, str): payload = payload.encode()
        
        b_id, b_mod = bot_id.encode(), module.encode()
        header = len(b_id).to_bytes(1, 'big') + len(b_mod).to_bytes(1, 'big') + len(payload).to_bytes(4, 'big')
        return header + b_id + b_mod + payload
    except Exception as e: 
        logger.Log.error(f"Pack Err: {e}"); return b""