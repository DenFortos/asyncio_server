// frontend/client_control/js/modules/features/fm/FileManagerUI.js

export const FileManagerUI = {
  $el: (tag, props = {}) => Object.assign(document.createElement(tag), props),

  formatSize: (s) => {
    if (!s || isNaN(s)) return s || '';
    const i = Math.floor(Math.log(s) / Math.log(1024));
    return (s / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
  },

  renderItems: (container, items, callbacks) => {
    container.innerHTML = items?.length ? '' : '<div class="empty-notice">Пусто</div>';
    items?.forEach(item => {
      const isDrive = item.type === 'drive', isDir = item.type === 'dir' || item.type === 'directory';
      const icon = isDrive ? 'fa-hard-drive' : (isDir ? 'fa-folder' : 'fa-file');
      const el = FileManagerUI.$el('div', {
        className: `file-item ${isDrive?'drive':(isDir?'directory':'file')} ${item.is_hidden ? 'file-hidden' : ''}`,
        innerHTML: `<i class="fas ${icon}"></i><div class="file-name" title="${item.name}">${item.name}</div>
                    ${item.size ? `<span class="file-size-tag">${FileManagerUI.formatSize(item.size)}</span>` : ''}`
      });
      el.onclick = (e) => { e.stopPropagation(); callbacks.onOpen(item); };
      el.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDrive) callbacks.onContext(e, item); };
      container.appendChild(el);
    });
  },

  showMenu: (menu, e, container, isItem) => {
    const rect = container.getBoundingClientRect();
    menu.innerHTML = isItem ? 
      `<div class="ctx-item" onclick="fm_cmd('download')"><i class="fas fa-download"></i> Скачать (.zip)</div>
       <div class="ctx-item" onclick="fm_cmd('run')"><i class="fas fa-play"></i> Запустить</div>
       <div class="ctx-separator"></div>
       <div class="ctx-item danger" onclick="fm_cmd('delete')"><i class="fas fa-trash"></i> Удалить</div>` :
      `<div class="ctx-item" onclick="fm_cmd('upload')"><i class="fas fa-upload"></i> Загрузить сюда</div>
       <div class="ctx-item" onclick="fm_cmd('mkdir')"><i class="fas fa-folder-plus"></i> Новая папка</div>`;
    Object.assign(menu.style, { left: `${e.clientX-rect.left}px`, top: `${e.clientY-rect.top}px`, display: 'block', zIndex: '10000' });
    menu.classList.remove('hidden');
  }
};