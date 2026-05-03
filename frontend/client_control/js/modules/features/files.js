 // frontend\client_control\js\modules\features\files.js

import { FileManagerUI as UI } from './fm/FileManagerUI.js';
import { FileOperations as Ops } from './fm/file_operations.js';
import { FileTransfer } from './fm/file_transfer.js';

/**
 * Управление файловым менеджером
 */
export const initFileManager = () => {
    const $ = id => document.getElementById(id);
    
    const body = $('files-body');
    const pathDisp = $('file-path-display');
    const term = $('files-overlay');
    const head = term?.querySelector('.terminal-header');
    const container = document.querySelector('.app-main') || document.body;
    
    const backBtn = $('file-back-btn');
    const homeBtn = $('file-home-btn');
    const viewHiddenBtn = $('file-view-btn');

    let state = {
        selectedItem: null,
        showHidden: false, 
        lastData: null     
    };

    // СЛУШАТЕЛИ СОБЫТИЙ
    window.addEventListener('FileManager:DT_START', (e) => {
        window.renderFileSystem(e.detail.payload, e.detail);
    });
    
    window.addEventListener('FileManager:DT_DATA', (e) => {
        window.renderFileSystem(e.detail.payload, e.detail);
    });

    UI.initDrag(head, term);
    UI.setupIsolation(term);

    const ctxMenu = UI.$el('div', { className: 'file-context-menu hidden' });
    container.append(ctxMenu);

    const hideMenu = () => ctxMenu.classList.add('hidden');

    /**
     * ГЛАВНЫЙ ОБРАБОТЧИК ДАННЫХ
     */
    window.renderFileSystem = (data, meta = {}) => {
        const action = meta.action || "";
        const fileName = meta.extra || "";

        // Обработка списка файлов (JSON)
        if (action === "LIST" || (data && data.type === "list")) {
            if (data instanceof ArrayBuffer) return; 

            state.lastData = data; 
            pathDisp.innerText = data.current_path;

            const itemsToRender = state.showHidden 
                ? data.items 
                : data.items.filter(item => !item.is_hidden);

            UI.renderItems(body, itemsToRender, {
                onOpen: (item) => {
                    hideMenu();
                    if (['dir', 'directory', 'drive'].includes(item.type)) {
                        sendNavCommand(item.path);
                    } else {
                        Ops.sendControlCommand('RUN', item.path);
                    }
                },
                onContext: (e, item) => {
                    state.selectedItem = item;
                    UI.showMenu(ctxMenu, e, container, true);
                }
            });
            return;
        }

        // Обработка скачивания (Бинарные данные)
        if (action === "DT_START") {
            const size = parseInt(data) || 0;
            FileTransfer.handleDownloadStart(fileName, size); 
        } 
        else if (action === "DT_DATA") {
            if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
                FileTransfer.handleDownloadData(fileName, data);
            }
        }
    };

    // Управление скрытыми файлами
    if (viewHiddenBtn) {
        viewHiddenBtn.onclick = (e) => {
            e.preventDefault();
            state.showHidden = !state.showHidden;
            viewHiddenBtn.classList.toggle('active', state.showHidden);
            if (state.lastData) window.renderFileSystem(state.lastData);
        };
    }

    const sendNavCommand = (path = "") => {
        if (!window.sendToBot) return;
        const targetPath = (path === "Computer" || !path) ? "Computer" : path.replace(/\\/g, '/');
        window.sendToBot('FileManager', {}, 'LIST', targetPath, 'json');
    };

    // Команды контекстного меню
    window.fm_cmd = (action) => {
        hideMenu();
        const currentPath = pathDisp.innerText.trim();
        if (action === 'download') {
            Ops.sendControlCommand('DOWNLOAD', state.selectedItem.path);
        } else if (action === 'upload') {
            FileTransfer.uploadFile(currentPath);
        } else {
            Ops.executeAction(action, state.selectedItem, currentPath, () => sendNavCommand(currentPath));
        }
    };

    // Клики по фону
    if (body) {
        body.oncontextmenu = (e) => {
            if (e.target === body || e.target.classList.contains('empty-notice')) {
                e.preventDefault();
                state.selectedItem = null;
                UI.showMenu(ctxMenu, e, container, false);
            }
        };
        body.onclick = hideMenu;
    }

    // Навигация
    if (backBtn) {
        backBtn.onclick = () => {
            hideMenu();
            let current = pathDisp.innerText.trim().replace(/\/+$/, '');
            if (current === "Computer" || current.length <= 3) return sendNavCommand("Computer");
            const parts = current.split('/');
            parts.pop();
            sendNavCommand(parts.join('/') || "Computer");
        };
    }

    if (homeBtn) {
        homeBtn.onclick = () => {
            hideMenu();
            sendNavCommand("Computer");
        };
    }

    // Закрытие окна
    const closeBtn = term?.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            term.classList.add('hidden');
            UI.resetWindow(term);
            state.lastData = null;
        };
    }

    // Входная точка
    window.openFileManager = () => {
        state.selectedItem = null;
        if (body) body.innerHTML = '<div class="loading-notice">Загрузка...</div>';
        UI.resetWindow(term); 
        term.classList.remove('hidden');
        sendNavCommand("Computer");
    };
};