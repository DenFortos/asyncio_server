// frontend/client_control/js/modules/features/files.js
import { FileManagerAPI as API } from './fm/FileManagerAPI.js';
import { FileManagerUI as UI } from './fm/FileManagerUI.js';

export const initFileManager = () => {
    const $ = id => document.getElementById(id);
    const body = $('files-body'), pathDisp = $('file-path-display'), term = $('files-overlay');
    const head = term?.querySelector('.terminal-header');
    const container = document.querySelector('.app-main') || document.body;

    const ctx = UI.$el('div', { className: 'file-context-menu hidden' });
    const upInput = UI.$el('input', { type: 'file', multiple: true, style: 'display:none' });
    
    // Состояние текущего скачивания
    let dlState = { name: '', size: 0, received: 0, chunks: [] };
    let state = { selected: null };

    const getPath = () => pathDisp?.innerText.trim() || "";
    container.append(ctx, upInput);

    // --- 1. СБРОС ПОЗИЦИИ (Центрирование) ---
    window.resetFileManagerPosition = () => {
        if (!term) return;
        // Удаляем инлайновые стили, чтобы сработал CSS (центр)
        ['left', 'top', 'width', 'height', 'transform', 'margin'].forEach(p => term.style[p] = '');
    };

    // --- 2. ПЕРЕМЕЩЕНИЕ ОКНА (Drag & Drop) ---
    if (head && term) {
        head.style.cursor = 'move';
        head.onmousedown = (e) => {
            if (e.target.closest('.file-nav-btn')) return;
            e.preventDefault();
            e.stopPropagation();

            // Если окно зафиксировано через CSS transform (в центре), 
            // пересчитываем его в реальные координаты перед движением
            if (getComputedStyle(term).transform !== 'none') {
                const rect = term.getBoundingClientRect();
                const parentRect = term.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
                term.style.left = `${rect.left - parentRect.left}px`;
                term.style.top = `${rect.top - parentRect.top}px`;
                term.style.transform = 'none';
                term.style.margin = '0';
            }

            const offX = e.clientX - term.offsetLeft;
            const offY = e.clientY - term.offsetTop;

            const move = (ev) => {
                ev.stopPropagation();
                term.style.left = `${ev.clientX - offX}px`;
                term.style.top = `${ev.clientY - offY}px`;
            };

            const stop = (ev) => {
                ev.stopPropagation();
                document.removeEventListener('mousemove', move, true);
            };

            document.addEventListener('mousemove', move, true);
            document.addEventListener('mouseup', stop, { once: true, capture: true });
        };
    }

    // --- 3. ЛОГИКА ПОЛЯ ПУТИ ---
    if (pathDisp) {
        pathDisp.setAttribute('contenteditable', 'true');
        pathDisp.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const p = getPath();
                API.send(p ? 'open' : 'list_drives', p);
                pathDisp.blur();
            }
        };
    }

    // --- 4. ОБРАБОТКА ДАННЫХ ОТ БОТА ---
    window.renderFileSystem = (data) => {
        const { type, items, current_path, status, refresh } = data;

        if (type === "list") {
            if (document.activeElement !== pathDisp) {
                pathDisp.innerText = (current_path === "Computer" || !current_path) ? "" : current_path;
            }
            UI.renderItems(body, items, {
                onOpen: (i) => ['dir', 'directory', 'drive'].includes(i.type) && API.send('open', i.path),
                onContext: (e, i) => { state.selected = i; UI.showMenu(ctx, e, container, true); }
            });
        }

        if (type === "status" && status === "success" && refresh) {
            API.send('open', refresh);
        }
    };

    // --- 5. СБОРКА ФАЙЛА (DOWNLOAD) ---
    window.addEventListener('FileTransfer_Start', e => {
        const { name, size } = e.detail;
        dlState = { name, size, received: 0, chunks: [] };
    });

    window.addEventListener('FileTransfer_Chunk', e => {
        const { name, data } = e.detail;
        if (name !== dlState.name) return;

        dlState.chunks.push(new Uint8Array(data));
        dlState.received += data.byteLength;

        if (dlState.received >= dlState.size) {
            const blob = new Blob(dlState.chunks);
            const a = UI.$el('a', { 
                href: URL.createObjectURL(blob), 
                download: dlState.name 
            });
            a.click();
            URL.revokeObjectURL(a.href);
            dlState.chunks = [];
        }
    });

    // --- 6. КОМАНДЫ UI ---
    window.fm_cmd = (act) => {
        const target = state.selected?.path || getPath();
        ctx.classList.add('hidden');
        
        if (act === 'download') API.send('download', target);
        if (act === 'upload') upInput.click();
        if (act === 'run') API.send('run', target);
        if (act === 'delete' && confirm('Удалить?')) API.send('delete', target);
        if (act === 'mkdir') { 
            const n = prompt("Имя папки:"); 
            if (n) API.send('mkdir', getPath(), { name: n }); 
        }
    };

    upInput.onchange = async () => {
        const p = getPath();
        for (const f of upInput.files) await API.upload(f, p);
        
        // Ждем 1 секунду, чтобы бот успел сохранить и закрыть файл
        setTimeout(() => API.send('open', p), 1000); 
        upInput.value = '';
    };

    // --- 7. КНОПКИ НАВИГАЦИИ ---
    $('file-back-btn').onclick = () => {
        let p = getPath().replace(/[\\/]$/, '');
        if (!p) return API.send('list_drives');
        const lastIdx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
        if (lastIdx !== -1) {
            let up = p.substring(0, lastIdx);
            if (up.length === 2 && up[1] === ':') up += '\\';
            API.send('open', up);
        } else {
            API.send('list_drives');
        }
    };

    $('file-home-btn').onclick = () => API.send('list_drives');
    
    const viewBtn = $('file-view-btn');
    if (viewBtn) viewBtn.onclick = () => {
        viewBtn.classList.toggle('active');
        const p = getPath();
        API.send(p ? 'open' : 'list_drives', p);
    };

    body.oncontextmenu = (e) => {
        e.preventDefault();
        if (e.target === body || e.target.classList.contains('empty-notice')) {
            state.selected = null; 
            UI.showMenu(ctx, e, container, false);
        }
    };

    document.addEventListener('mousedown', e => !ctx.contains(e.target) && ctx.classList.add('hidden'), { capture: true });

    // --- 8. ОТКРЫТИЕ / ПЕРЕЗАПУСК (Reset State) ---
    window.openFileManager = () => { 
        // Сброс позиции окна
        window.resetFileManagerPosition();
        
        // Очистка состояний UI
        state.selected = null;
        if (pathDisp) pathDisp.innerText = "";
        if (body) body.innerHTML = '<div class="loading-status">Запрос списка дисков...</div>';
        
        // Первичный запрос к боту
        API.send('list_drives'); 
    };
};