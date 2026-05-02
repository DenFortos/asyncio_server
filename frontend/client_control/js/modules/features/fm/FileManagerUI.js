// frontend/client_control/js/modules/features/fm/FileManagerUI.js

export const FileManagerUI = {
  // Быстрое создание DOM-элемента с заданными свойствами
  $el: (tag, props = {}) => Object.assign(document.createElement(tag), props),

  // Преобразование числа байтов в читаемый текст (напр. 1.2 MB)
  formatSize: (s) => {
    if (s === 0) return '0 B';
    if (!s || isNaN(s)) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(s) / Math.log(1024));
    return `${(s / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  },

  /**
   * Отрисовка списка элементов в окне проводника
   */
  renderItems: (container, items, callbacks) => {
    // Очистка контейнера или показ надписи "Пусто"
    container.innerHTML = items?.length ? '' : '<div class="empty-notice">Пусто</div>';

    items?.forEach(item => {
      const { type, name, size, is_hidden } = item;
      
      // Определяем иконку и класс в зависимости от типа объекта
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

      // Событие при клике (открытие папки/диска)
      el.onclick = e => { 
        e.stopPropagation(); 
        callbacks.onOpen(item); 
      };

      // Событие правой кнопки мыши (контекстное меню)
      el.oncontextmenu = e => {
        e.preventDefault(); 
        e.stopPropagation();
        // Диски обычно не имеют контекстного меню удаления
        !isDrive && callbacks.onContext(e, item);
      };

      container.appendChild(el);
    });
  },

  /**
   * Позиционирование и показ контекстного меню
   */
  showMenu: (menu, e, container, isItem) => {
    const rect = container.getBoundingClientRect();
    
    // Шаблон для файлов/папок
    const itemTpl = `
      <div class="ctx-item" onclick="fm_cmd('download')"><i class="fas fa-download"></i> Скачать (.zip)</div>
      <div class="ctx-item" onclick="fm_cmd('run')"><i class="fas fa-play"></i> Запустить</div>
      <div class="ctx-separator"></div>
      <div class="ctx-item danger" onclick="fm_cmd('delete')"><i class="fas fa-trash"></i> Удалить</div>`;

    // Шаблон для пустого места (создание/загрузка)
    const bgTpl = `
      <div class="ctx-item" onclick="fm_cmd('upload')"><i class="fas fa-upload"></i> Загрузить сюда</div>
      <div class="ctx-item" onclick="fm_cmd('mkdir')"><i class="fas fa-folder-plus"></i> Новая папка</div>`;

    menu.innerHTML = isItem ? itemTpl : bgTpl;

    // Установка позиции меню относительно контейнера проводника
    Object.assign(menu.style, {
      left: `${e.clientX - rect.left}px`,
      top: `${e.clientY - rect.top}px`,
      display: 'block',
      zIndex: '10000'
    });
    
    menu.classList.remove('hidden');
  }
};