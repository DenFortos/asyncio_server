// frontend/client_control/js/modules/features/fm/FileManagerAPI.js

export const FileManagerAPI = {
  // Отправка JSON-команд боту через глобальный мост
  send: (action, path, extra = {}) => {
    const isHidden = document.getElementById('file-view-btn')?.classList.contains('active');
    const payload = {
      action,
      path: path === "Computer" ? "" : path,
      show_hidden: !!isHidden,
      ...extra
    };
    window.sendToBot?.('FileManager', JSON.stringify(payload));
  },

  // Потоковая загрузка файла на сервер по чанкам
  upload: async (file, currentPath) => {
    const CHUNK_SIZE = 65536;
    const cleanPath = currentPath === "Computer" ? "" : currentPath;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let offset = 0;

    // Инициализация загрузки
    FileManagerAPI.send('start', cleanPath, { name: file.name, size: file.size });
    await wait(100);

    // Потоковая передача данных
    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      window.sendToBot?.('FileManager', new Uint8Array(chunk));
      offset += CHUNK_SIZE;
      await wait(5);
    }

    await wait(200);
    FileManagerAPI.send('stop', cleanPath, { name: file.name });
  }
};