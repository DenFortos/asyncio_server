// frontend/client_control/js/modules/features/fm/FileManagerAPI.js

export const FileManagerAPI = {
  send: (action, path, extra = {}) => {
    const isHidden = document.getElementById('file-view-btn')?.classList.contains('active');
    window.sendToBot?.('FileManager', JSON.stringify({ 
      action, path: (path === "Computer" ? "" : path), show_hidden: !!isHidden, ...extra 
    }));
  },

  upload: async (file, currentPath) => {
    const CHUNK_SIZE = 65536; let offset = 0;
    window.sendToBot?.('FileManager', JSON.stringify({ action: 'start', name: file.name, path: (currentPath === "Computer" ? "" : currentPath), size: file.size }));
    await new Promise(r => setTimeout(r, 100));
    while (offset < file.size) {
      const buffer = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      window.sendToBot?.('FileManager', new Uint8Array(buffer));
      offset += CHUNK_SIZE; await new Promise(r => setTimeout(r, 5));
    }
    await new Promise(r => setTimeout(r, 200));
    window.sendToBot?.('FileManager', JSON.stringify({ action: 'stop', name: file.name }));
  }
};