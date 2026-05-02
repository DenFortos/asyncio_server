// frontend\client_control\js\modules\features\files.js

import { FileManagerUI as UI } from './fm/FileManagerUI.js';

export const initFileManager = () => {
    const $ = id => document.getElementById(id);
    
    const body = $('files-body');
    const pathDisp = $('file-path-display');
    const term = $('files-overlay');
    const head = term?.querySelector('.terminal-header');
    const searchInput = $('file-search-input');
    const container = document.querySelector('.app-main') || document.body;

    // Стилизация строки пути
    if (pathDisp) {
        Object.assign(pathDisp.style, {
            flex: "1",
            minWidth: "200px",
            overflow: "hidden",
            whiteSpace: "nowrap"
        });
        pathDisp.setAttribute('contenteditable', 'true');
    }

    const ctxMenu = UI.$el('div', { className: 'file-context-menu hidden' });
    container.append(ctxMenu);

    let state = { 
        selectedItem: null, 
        currentItems: [] 
    };

    /**
     * Отправка команды LIST боту
     */
    const sendCommand = (action, path = "") => {
        if (!window.sendToBot) return;

        let targetPath = (path === "Computer" || !path) ? "Computer" : path;
        
        // Оставляем только замену слэшей, НЕ удаляем слэш в конце
        targetPath = targetPath.replace(/\\/g, '/');

        console.log(`[JS -> Bot] Requesting: ${action} | Path: ${targetPath}`);
        window.sendToBot('FileManager', {}, action, targetPath);
    };

    const getCurrentPath = () => pathDisp?.innerText.trim() || "";

    /**
     * Рендеринг интерфейса
     */
    const renderUI = (items, updateState = true) => {
        if (updateState) state.currentItems = items;
        
        UI.renderItems(body, items, {
            onOpen: (item) => {
                // Если это папка или диск — запрашиваем путь, который прислал бот
                const isNavigable = ['dir', 'directory', 'drive'].includes(item.type);
                if (isNavigable && item.path) {
                    sendCommand('LIST', item.path);
                }
            },
            onContext: (e, item) => {
                state.selectedItem = item;
                UI.showMenu(ctxMenu, e, container, true);
            }
        });
    };

    /**
     * Прием данных от бота
     */
    window.renderFileSystem = (data) => {
        if (data.type === "list") {
            if (searchInput) searchInput.value = '';

            if (document.activeElement !== pathDisp) {
                pathDisp.innerText = data.current_path;
            }
            renderUI(data.items);
        }
    };

    /**
     * Обработка команд контекстного меню
     */
    window.fm_cmd = (action) => {
        ctxMenu.classList.add('hidden');
        const path = state.selectedItem?.path || getCurrentPath();
        
        if (action === 'refresh') sendCommand('LIST', getCurrentPath());
        else console.log(`[Action] ${action} on ${path}`);
    };

    /**
     * Навигация: Назад (UP)
     */
    $('file-back-btn').onclick = () => {
        let current = getCurrentPath().replace(/\/+$/, '');
        
        // Если корень или Computer — выходим в список дисков
        if (current === "Computer" || current.length <= 3) {
            sendCommand('LIST', "Computer");
            return;
        }

        const parts = current.split('/');
        parts.pop();
        let parent = parts.join('/');
        if (parent.endsWith(':')) parent += '/';
        
        sendCommand('LIST', parent || "Computer");
    };

    $('file-home-btn').onclick = () => sendCommand('LIST', "Computer");

    // Ручной ввод пути
    pathDisp.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendCommand('LIST', getCurrentPath());
            pathDisp.blur();
        }
    };

    // Закрытие меню при клике мимо
    document.addEventListener('mousedown', (e) => {
        if (!ctxMenu.contains(e.target)) ctxMenu.classList.add('hidden');
    }, { capture: true });

    // Drag & Drop окна
    if (head && term) {
        head.onmousedown = (e) => {
            if (e.target.closest('.file-nav-btn') || e.target.closest('input')) return;
            const shiftX = e.clientX - term.offsetLeft;
            const shiftY = e.clientY - term.offsetTop;

            const moveAt = (ev) => {
                term.style.left = (ev.clientX - shiftX) + 'px';
                term.style.top = (ev.clientY - shiftY) + 'px';
                term.style.transform = 'none';
                term.style.margin = '0';
            };

            const onMouseMove = (ev) => moveAt(ev);
            document.addEventListener('mousemove', onMouseMove);
            document.onmouseup = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.onmouseup = null;
            };
        };
    }

    // Инициализация (запуск)
    window.openFileManager = () => {
        state.selectedItem = null;
        if (body) body.innerHTML = 'Загрузка...';
        sendCommand('LIST', "Computer");
    };
};