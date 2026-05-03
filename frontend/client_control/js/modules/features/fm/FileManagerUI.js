// frontend\client_control\js\modules\features\fm\FileManagerUI.js

/**
 * UI компоненты и рендеринг для File Manager
 */
export const FileManagerUI = {
    // Хелпер для создания элементов
    $el: (tag, props = {}) => Object.assign(document.createElement(tag), props),

    // Форматирование размера файла
    formatSize: (s) => {
        if (!s || isNaN(s)) return '0 B';
        const i = Math.floor(Math.log(s) / Math.log(1024));
        return `${(s / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
    },

    // Остановка всплытия событий, чтобы клики внутри ФМ не трогали основной интерфейс
    setupIsolation: (term) => {
        if (!term) return;
        ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach(type => {
            term.addEventListener(type, (e) => e.stopPropagation());
        });
    },

    // Сброс позиции окна
    resetWindow: (term) => {
        if (!term) return;
        ['left', 'top', 'width', 'height', 'transform', 'margin'].forEach(p => term.style[p] = '');
    },

    // Логика перетаскивания окна за хедер
    initDrag: (head, term) => {
        if (!head || !term) return;
        head.style.cursor = 'move';
        head.onmousedown = (e) => {
            if (e.target.closest('.file-nav-btn') || e.target.closest('input')) return;
            e.stopPropagation();
            
            if (getComputedStyle(term).transform !== 'none') {
                const r = term.getBoundingClientRect();
                const p = term.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
                Object.assign(term.style, {
                    left: `${r.left - p.left}px`, top: `${r.top - p.top}px`,
                    transform: 'none', margin: '0'
                });
            }
            
            const offX = e.clientX - term.offsetLeft;
            const offY = e.clientY - term.offsetTop;

            const move = (ev) => {
                term.style.left = `${ev.clientX - offX}px`;
                term.style.top = `${ev.clientY - offY}px`;
            };

            const stop = () => document.removeEventListener('mousemove', move, true);
            document.addEventListener('mousemove', move, true);
            document.addEventListener('mouseup', stop, { once: true, capture: true });
        };
    },

    /**
     * Отрисовка контекстного меню
     */
    showMenu: (menu, event, container, isItemClick = false) => {
        const { clientX: x, clientY: y } = event;
        menu.innerHTML = '';
        const actions = [];

        if (isItemClick) {
            // Меню для конкретного файла/папки
            actions.push({ label: 'Запустить', icon: 'fa-play', cmd: 'run' });
            actions.push({ label: 'Скачать (ZIP)', icon: 'fa-download', cmd: 'download' });
            actions.push({ label: 'Удалить', icon: 'fa-trash', cmd: 'delete', class: 'danger' });
        } else {
            // Меню для пустого места в папке
            actions.push({ label: 'Загрузить сюда', icon: 'fa-upload', cmd: 'upload' });
            actions.push({ label: 'Создать папку', icon: 'fa-folder-plus', cmd: 'mkdir' });
        }

        actions.forEach(act => {
            const btn = FileManagerUI.$el('div', {
                className: `ctx-item ${act.class || ''}`,
                innerHTML: `<i class="fas ${act.icon}"></i> <span>${act.label}</span>`
            });
            btn.onclick = (e) => {
                e.stopPropagation();
                window.fm_cmd(act.cmd);
            };
            menu.appendChild(btn);
        });

        menu.classList.remove('hidden');
        const rect = container.getBoundingClientRect();
        menu.style.left = `${x - rect.left}px`;
        menu.style.top = `${y - rect.top}px`;
    },

    /**
     * Отрисовка списка файлов
     */
    renderItems: (container, items, callbacks) => {
        container.innerHTML = items?.length ? '' : '<div class="empty-notice">Пусто</div>';
        
        items?.forEach(item => {
            const isFolder = item.type === 'dir' || item.type === 'directory';
            const isDrive = item.type === 'drive';
            const typeClass = isDrive ? 'drive' : (isFolder ? 'directory' : 'file');
            
            const el = FileManagerUI.$el('div', {
                className: `file-item ${typeClass} ${item.is_hidden ? 'file-hidden' : ''}`,
                innerHTML: `
                    <i class="fas ${isDrive ? 'fa-hard-drive' : (isFolder ? 'fa-folder' : 'fa-file')}"></i>
                    <div class="file-name" title="${item.name}">${item.name}</div>
                    ${(!isFolder && !isDrive && item.size) ? `<span class="file-size-tag">${FileManagerUI.formatSize(item.size)}</span>` : ''}
                `
            });

            el.onclick = (e) => { 
                e.stopPropagation(); 
                callbacks.onOpen(item); 
            };

            el.oncontextmenu = (e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                // Для дисков контекстное меню обычно не нужно
                if (!isDrive) callbacks.onContext(e, item); 
            };

            container.appendChild(el);
        });
    }
};