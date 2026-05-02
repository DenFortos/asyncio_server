// frontend\client_control\js\modules\features\fm\FileManagerUI.js

export const FileManagerUI = {
  
  $el: (tag, props = {}) => Object.assign(document.createElement(tag), props),

  formatSize: (s) => {
    if (s === 0) return '0 B';
    if (!s || isNaN(s)) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(s) / Math.log(1024));
    return `${(s / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  },

  /**
   * Отрисовка списка элементов
   */
  renderItems: (container, items, callbacks) => {
    container.innerHTML = items?.length ? '' : '<div class="empty-notice">Пусто или доступ ограничен</div>';

    items?.forEach(item => {
      const { type, name, size, is_hidden, path } = item;
      
      const isDrive = type === 'drive';
      const isDir = type === 'dir' || type === 'directory';
      const icon = isDrive ? 'fa-hard-drive' : (isDir ? 'fa-folder' : 'fa-file');
      
      const cls = `file-item ${isDrive ? 'drive' : (isDir ? 'directory' : 'file')} ${is_hidden ? 'file-hidden' : ''}`;

      const el = FileManagerUI.$el('div', {
        className: cls,
        innerHTML: `
          <i class="fas ${icon}"></i>
          <div class="file-name" title="${name}">${name}</div>
          ${(size && !isDir && !isDrive) ? `<span class="file-size-tag">${FileManagerUI.formatSize(size)}</span>` : ''}`
      });

      // КЛИК: Передаем весь объект item в callback
      el.onclick = e => { 
        e.stopPropagation(); 
        console.log(`[UI] Interaction with: ${name} | Path: ${path}`);
        callbacks.onOpen(item); 
      };

      // ПКМ: Контекстное меню
      el.oncontextmenu = e => {
        e.preventDefault(); 
        e.stopPropagation();
        if (!isDrive) callbacks.onContext(e, item);
      };

      container.appendChild(el);
    });
  },

  /**
   * Управление контекстным меню
   */
  showMenu: (menu, e, container, isItem) => {
    const rect = container.getBoundingClientRect();
    
    const itemTpl = `
      <div class="ctx-item" onclick="fm_cmd('download')"><i class="fas fa-download"></i> Скачать</div>
      <div class="ctx-item" onclick="fm_cmd('run')"><i class="fas fa-play"></i> Запустить</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item danger" onclick="fm_cmd('delete')"><i class="fas fa-trash"></i> Удалить</div>`;

    const bgTpl = `
      <div class="ctx-item" onclick="fm_cmd('upload')"><i class="fas fa-upload"></i> Загрузить</div>
      <div class="ctx-item" onclick="fm_cmd('mkdir')"><i class="fas fa-folder-plus"></i> Новая папка</div>
      <div class="ctx-item" onclick="fm_cmd('refresh')"><i class="fas fa-sync"></i> Обновить</div>`;

    menu.innerHTML = isItem ? itemTpl : bgTpl;

    Object.assign(menu.style, {
      left: `${e.clientX - rect.left}px`,
      top: `${e.clientY - rect.top}px`,
      display: 'block'
    });
    
    menu.classList.remove('hidden');
  }
};