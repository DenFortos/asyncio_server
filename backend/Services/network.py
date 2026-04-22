# backend/Core/network.py
import json, asyncio, logs.LoggerWrapper as logger

def has_access(user, tid):
    "Единая проверка прав доступа: admin или совпадение префикса"
    if not user: return False
    r, p = user.get("role", "user"), str(user.get("prefix", "NONE"))
    return r == "admin" or p == "ALL" or tid.startswith(p)

async def read_packet(reader):
    "Чтение и десериализация пакета L1(1)-L2(1)-L3(4)"
    try:
        h = await reader.readexactly(6)
        l1, l2, l3 = h[0], h[1], int.from_bytes(h[2:6], "big")
        b = await reader.readexactly(l1 + l2 + l3)
        bid, mod, raw = b[:l1].decode(errors='ignore'), b[l1:l1+l2].decode(errors='ignore'), b[l1+l2:]
        try: pay = json.loads(raw.decode())
        except: 
            try: pay = raw.decode()
            except: pay = raw
        return bid, mod, pay
    except: return None, None, None

def pack_packet(bid, mod, pay):
    "Сборка пакета: [L1][L2][L3][ID][MOD][PAYLOAD]"
    try:
        if isinstance(pay, (dict, list)): p_pay = json.dumps(pay, separators=(',', ':'), ensure_ascii=False).encode()
        elif isinstance(pay, str): p_pay = pay.encode()
        else: p_pay = pay if isinstance(pay, bytes) else str(pay).encode()
        b_id, b_mod = bid.encode(), mod.encode()
        header = len(b_id).to_bytes(1, 'big') + len(b_mod).to_bytes(1, 'big') + len(p_pay).to_bytes(4, 'big')
        return header + b_id + b_mod + p_pay
    except Exception as e:
        logger.Log.error(f"[Protocol] Pack Err: {e}"); return b""