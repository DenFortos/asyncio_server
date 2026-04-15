# backend/Services/__init__.py
from .ClientManager import close_client, active_clients as client, send_binary_to_bot
from .Auth import authorize_client, sync_bot_data