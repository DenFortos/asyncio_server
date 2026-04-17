// frontend/client_control/js/modules/features/fm/FileManagerUI.js

// Управление визуальным представлением файлового менеджера и контекстных меню
export const FileManagerUI = {
  $el: (tag, props = {}) => Object.assign(document.createElement(tag), props),

  // Рендеринг списка файлов и папок с привязкой событий
  renderItems: (container, items, callbacks) => {
    container.innerHTML = items?.length ? '' : '<div class="empty-notice">Empty</div>';
    
    items?.forEach(item => {
      const { type, name, size, is_hidden } = item;
      const icon = type === 'drive' ? 'fa-hard-drive' : (type === 'directory' ? 'fa-folder' : 'fa-file');
      const el = FileManagerUI.$el('div', {
        className: `file-item ${type} ${is_hidden ? 'file-hidden' : ''}`,
        innerHTML: `
          <i class="fas ${icon}"></i>
          <div class="file-name" title="${name}">${name}</div>
          ${size ? `<span class="file-size-tag">${size}</span>` : ''}`
      });

      // Блокировка пробития клика и вызов действия открытия
      el.onclick = (e) => {
        e.stopPropagation();
        callbacks.onOpen(item);
      };

      // Блокировка системного меню и вызов кастомного контекстного меню
      el.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        callbacks.onContext(e, item);
      };
      
      container.appendChild(el);
    });
  },

  // Отображение и позиционирование контекстного меню
  showMenu: (menu, e, container, isItem) => {
    const rect = container.getBoundingClientRect();
    
    e.preventDefault(); 
    e.stopPropagation(); 

    // Изоляция событий внутри меню
    ['mousedown', 'mouseup', 'click'].forEach(t => menu[`on${t}`] = ev => ev.stopPropagation());
    menu.oncontextmenu = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };

    menu.innerHTML = isItem ? 
      `<div class="ctx-item" onclick="fm_cmd('download')"><i class="fas fa-download"></i> Скачать (.zip)</div>
       <div class="ctx-item" onclick="fm_cmd('run')"><i class="fas fa-play"></i> Запустить</div>
       <div class="ctx-separator"></div>
       <div class="ctx-item danger" onclick="fm_cmd('delete')"><i class="fas fa-trash"></i> Удалить</div>` :
      `<div class="ctx-item" onclick="fm_cmd('upload')"><i class="fas fa-upload"></i> Загрузить сюда</div>
       <div class="ctx-item" onclick="fm_cmd('mkdir')"><i class="fas fa-folder-plus"></i> Новая папка</div>`;
    
    Object.assign(menu.style, { 
      left: `${e.clientX - rect.left}px`, 
      top: `${e.clientY - rect.top}px`, 
      display: 'block', 
      zIndex: '2147483647' 
    });
    
    menu.classList.remove('hidden');
  }
};