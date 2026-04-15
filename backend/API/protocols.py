# backend\API\protocols.py
def pack_bot_command(bot_id, module, payload):
    id_bytes, mod_bytes, pay_bytes = bot_id.encode(), module.encode(), payload.encode()
    header = len(id_bytes).to_bytes(1, 'big') + len(mod_bytes).to_bytes(1, 'big') + len(pay_bytes).to_bytes(4, 'big')
    return header + id_bytes + mod_bytes + pay_bytes

def has_access(user, target_id):
    if not user: return False
    return any([user["role"] == "admin", user["prefix"] == "ALL", target_id.startswith(str(user.get("prefix", "NONE")))])