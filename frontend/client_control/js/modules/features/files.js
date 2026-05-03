 // frontend\client_control\js\modules\features\files.js

import { FileManagerUI as UI } from './fm/FileManagerUI.js';
import { FileOperations as Ops } from './fm/file_operations.js';
import { FileTransfer } from './fm/file_transfer.js';

/**
 * Управление файловым менеджером
 */
export const initFileManager = () => {
    const $ = id => document.getElementById(id);
    
    // Элементы DOM
    const body = $('files-body');
    const pathDisp = $('file-path-display');
    const term = $('files-overlay');
    const head = term?.querySelector('.terminal-header');
    const container = document.querySelector('.app-main') || document.body;
    
    const backBtn = $('file-back-btn');
    const homeBtn = $('file-home-btn');
    const viewHiddenBtn = $('file-view-btn');

    // Внутреннее состояние
    let state = {
        selectedItem: null,
        showHidden: false, 
        lastData: null     
    };

    // --- НОВАЯ ЧАСТЬ: СЛУШАТЕЛИ СОБЫТИЙ ---
    // Слушаем все события от FileManager и направляем в renderFileSystem
    window.addEventListener('FileManager:LIST', (e) => window.renderFileSystem(e.detail.payload, e.detail));
    window.addEventListener('FileManager:DT_START', (e) => window.renderFileSystem(e.detail.payload, e.detail));
    window.addEventListener('FileManager:DT_DATA', (e) => window.renderFileSystem(e.detail.payload, e.detail));
    // --------------------------------------

    // Инициализация базового UI
    UI.initDrag(head, term);
    UI.setupIsolation(term);

    // Создание контекстного меню
    const ctxMenu = UI.$el('div', { className: 'file-context-menu hidden' });
    container.append(ctxMenu);

    const hideMenu = () => ctxMenu.classList.add('hidden');

    /**
     * ГЛАВНЫЙ ОБРАБОТЧИК ДАННЫХ (Вызывается из ws_handler или через события выше)
     */
    window.renderFileSystem = (data, meta = {}) => {
        console.log("[FM] Received Packet:", { action: meta.action, extra: meta.extra, dataType: typeof data });

        const action = meta.action || "";

        // Сценарий 1: Получение списка файлов (LIST)
        if (action === "LIST" || (data && data.type === "list")) {
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

        // Сценарий 2: Скачивание (DT_START / DT_DATA)
        const fileName = meta.extra;

        if (action === "DT_START") {
            FileTransfer.handleDownloadStart(fileName, data); 
        } 
        else if (action === "DT_DATA") {
            if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
                FileTransfer.handleDownloadData(fileName, data);
            } else if (data instanceof Blob) {
                data.arrayBuffer().then(buf => {
                    FileTransfer.handleDownloadData(fileName, buf);
                });
            }
        }
    };

    if (viewHiddenBtn) {
        viewHiddenBtn.onclick = (e) => {
            e.preventDefault();
            state.showHidden = !state.showHidden;
            viewHiddenBtn.classList.toggle('active', state.showHidden);
            const icon = viewHiddenBtn.querySelector('i');
            if (icon) icon.className = state.showHidden ? 'fas fa-eye' : 'fas fa-eye-slash';
            if (state.lastData) window.renderFileSystem(state.lastData);
        };
    }

    const sendNavCommand = (path = "") => {
        if (!window.sendToBot) return;
        const targetPath = (path === "Computer" || !path) ? "Computer" : path.replace(/\\/g, '/');
        window.sendToBot('FileManager', {}, 'LIST', targetPath, 'json');
    };

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

    if (backBtn) {
        backBtn.onclick = () => {
            hideMenu();
            let current = pathDisp.innerText.trim().replace(/\/+$/, '');
            if (current === "Computer" || current.length <= 3) return sendNavCommand("Computer");
            const parts = current.split('/');
            parts.pop();
            let parent = parts.join('/');
            if (parent.endsWith(':')) parent += '/';
            sendNavCommand(parent || "Computer");
        };
    }

    if (homeBtn) {
        homeBtn.onclick = () => {
            hideMenu();
            sendNavCommand("Computer");
        };
    }

    const closeBtn = term?.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            term.classList.add('hidden');
            hideMenu();
            UI.resetWindow(term);
            state.lastData = null;
        };
    }

    window.openFileManager = () => {
        state.selectedItem = null;
        hideMenu();
        if (body) body.innerHTML = '<div class="loading-notice">Загрузка...</div>';
        UI.resetWindow(term); 
        term.classList.remove('hidden');
        sendNavCommand("Computer");
    };
};