// frontend/client_control/js/modules/features/fm/FileManagerUI.js

export const FileManagerUI = {
  // Быстрое создание DOM-элемента с пропсами
  $el: (tag, props = {}) => Object.assign(document.createElement(tag), props),

  // Форматирование байтов в читаемый размер
  formatSize: (s) => {
    if (!s || isNaN(s)) return s || '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(s) / Math.log(1024));
    return `${(s / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  },

  // Отрисовка списка файлов и папок в контейнере
  renderItems: (container, items, callbacks) => {
    container.innerHTML = items?.length ? '' : '<div class="empty-notice">Пусто</div>';

    items?.forEach(item => {
      const { type, name, size, is_hidden } = item;
      const isDrive = type === 'drive', isDir = type === 'dir' || type === 'directory';
      const icon = isDrive ? 'fa-hard-drive' : (isDir ? 'fa-folder' : 'fa-file');
      const cls = `file-item ${isDrive ? 'drive' : (isDir ? 'directory' : 'file')} ${is_hidden ? 'file-hidden' : ''}`;

      const el = FileManagerUI.$el('div', {
        className: cls,
        innerHTML: `
          <i class="fas ${icon}"></i>
          <div class="file-name" title="${name}">${name}</div>
          ${size ? `<span class="file-size-tag">${FileManagerUI.formatSize(size)}</span>` : ''}`
      });

      el.onclick = e => { e.stopPropagation(); callbacks.onOpen(item); };
      el.oncontextmenu = e => {
        e.preventDefault(); e.stopPropagation();
        !isDrive && callbacks.onContext(e, item);
      };

      container.appendChild(el);
    });
  },

  // Отображение контекстного меню с позиционированием
  showMenu: (menu, e, container, isItem) => {
    const rect = container.getBoundingClientRect();
    const itemTpl = `
      <div class="ctx-item" onclick="fm_cmd('download')"><i class="fas fa-download"></i> Скачать (.zip)</div>
      <div class="ctx-item" onclick="fm_cmd('run')"><i class="fas fa-play"></i> Запустить</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item danger" onclick="fm_cmd('delete')"><i class="fas fa-trash"></i> Удалить</div>`;

    const bgTpl = `
      <div class="ctx-item" onclick="fm_cmd('upload')"><i class="fas fa-upload"></i> Загрузить сюда</div>
      <div class="ctx-item" onclick="fm_cmd('mkdir')"><i class="fas fa-folder-plus"></i> Новая папка</div>`;

    menu.innerHTML = isItem ? itemTpl : bgTpl;
    Object.assign(menu.style, {
      left: `${e.clientX - rect.left}px`,
      top: `${e.clientY - rect.top}px`,
      display: 'block',
      zIndex: '10000'
    });
    menu.classList.remove('hidden');
  }
};