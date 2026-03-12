# backend\API\protocols.py

def pack_bot_command(bot_id: str, mod: str, payload: str):
    """Универсальная упаковка: [ID_LEN][MOD_LEN][PAY_LEN(4)][DATA]"""
    b_id = bot_id.encode('utf-8')
    b_mod = mod.encode('utf-8')
    b_pay = payload.encode('utf-8')

    header = (
        len(b_id).to_bytes(1, 'big') +
        len(b_mod).to_bytes(1, 'big') +
        len(b_pay).to_bytes(4, 'big')
    )
    return header + b_id + b_mod + b_pay

def has_access(user, target_id):
    """Проверка прав доступа к боту."""
    if not user: return False
    return user["role"] == "admin" or user["prefix"] == "ALL" or target_id.startswith(user["prefix"])