# backend\Core\network.py
import json, asyncio, logs.LoggerWrapper as logger

def has_access(user, target_id):
    "Единая проверка прав доступа"
    if not user: return False
    r, p = user.get("role", "user"), str(user.get("prefix", "NONE"))
    return r == "admin" or p == "ALL" or target_id.startswith(p)

async def read_packet(reader):
    "Чтение и десериализация пакета L1-L2-L3"
    try:
        h = await reader.readexactly(6)
        l1, l2, l3 = h[0], h[1], int.from_bytes(h[2:6], "big")
        b = await reader.readexactly(l1 + l2 + l3)
        bot_id, mod, raw = b[:l1].decode(errors='ignore'), b[l1:l1+l2].decode(errors='ignore'), b[l1+l2:]
        try: payload = json.loads(raw.decode())
        except:
            try: payload = raw.decode()
            except: payload = raw
        return bot_id, mod, payload
    except: return None, None, None

def pack_packet(bot_id, module, payload):
    "Сборка универсального пакета для бота или фронтенда"
    try:
        if isinstance(payload, (dict, list)): p_pay = json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode()
        elif isinstance(payload, str): p_pay = payload.encode()
        else: p_pay = payload if isinstance(payload, bytes) else str(payload).encode()
        b_id, b_mod = bot_id.encode(), module.encode()
        header = len(b_id).to_bytes(1, 'big') + len(b_mod).to_bytes(1, 'big') + len(p_pay).to_bytes(4, 'big')
        return header + b_id + b_mod + p_pay
    except Exception as e:
        logger.Log.error(f"[Protocol] Pack Err: {e}"); return b""