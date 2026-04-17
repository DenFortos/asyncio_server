// frontend/client_control/js/modules/features/fm/FileManagerAPI.js

// Взаимодействие с API бота для управления файлами и передачи данных
export const FileManagerAPI = {
  // Отправка JSON-команд управления
  send: (action, path, extra = {}) => {
    const isHidden = document.getElementById('file-view-btn')?.classList.contains('active');
    window.sendToBot?.('FileManager', JSON.stringify({ action, path, show_hidden: !!isHidden, ...extra }));
  },

  // Потоковая загрузка файла на устройство частями (chunks)
  upload: async (file, currentPath) => {
    const CHUNK_SIZE = 65536;
    let offset = 0;

    window.sendToBot?.('FileUploader', JSON.stringify({ action: 'start', name: file.name, path: currentPath, size: file.size }));
    await new Promise(r => setTimeout(r, 150));

    while (offset < file.size) {
      const buffer = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      window.sendToBot?.('FileUploader', new Uint8Array(buffer));
      offset += CHUNK_SIZE;
      await new Promise(r => setTimeout(r, 5));
    }

    await new Promise(r => setTimeout(r, 300));
    window.sendToBot?.('FileUploader', JSON.stringify({ action: 'stop', name: file.name }));
  }
};