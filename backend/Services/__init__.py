# backend/Services/__init__.py
from .Auth import authorize_bot, sync_bot_data
from .ClientManager import active_clients as client
from .ClientManager import send_binary_to_bot, close_client, close_all_clients, list_clients