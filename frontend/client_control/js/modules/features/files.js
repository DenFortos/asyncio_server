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
    
    let dlState = { name: '', size: 0, received: 0, chunks: [] };
    let state = { selected: null };

    const getPath = () => pathDisp?.innerText.trim() || "";
    container.append(ctx, upInput);

    // --- 1. ПЕРЕМЕЩЕНИЕ И ОКНО (Без изменений) ---
    window.resetFileManagerPosition = () => {
        if (!term) return;
        ['left', 'top', 'width', 'height', 'transform', 'margin'].forEach(p => term.style[p] = '');
    };

    if (head && term) {
        head.style.cursor = 'move';
        head.onmousedown = (e) => {
            if (e.target.closest('.file-nav-btn')) return;
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
                term.style.left = `${ev.clientX - offX}px`;
                term.style.top = `${ev.clientY - offY}px`;
            };
            const stop = () => document.removeEventListener('mousemove', move, true);
            document.addEventListener('mousemove', move, true);
            document.addEventListener('mouseup', stop, { once: true, capture: true });
        };
    }

    // --- 2. ЛОГИКА ПУТИ ---
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

    // --- 3. ОБРАБОТКА ДАННЫХ ОТ БОТА (LIST) ---
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
        if (type === "status" && status === "success" && refresh) API.send('open', refresh);
    };

    // --- 4. СБОРКА ФАЙЛА (DT - Download Transfer) ---
    // Слушаем новое событие анонса: FileManager:DT_START
    window.addEventListener('FileManager:DT_START', e => {
        const fileName = e.detail.extra; // Имя файла из заголовка
        const fileSize = parseInt(e.detail.payload); // Размер из payload
        console.log(`[DT] Анонс файла: ${fileName}, размер: ${fileSize}`);
        dlState = { name: fileName, size: fileSize, received: 0, chunks: [] };
    });

    // Слушаем чанки данных: FileManager:DT_DATA
    window.addEventListener('FileManager:DT_DATA', e => {
        const chunk = e.detail.payload; 
        if (!dlState.name) return;

        dlState.chunks.push(new Uint8Array(chunk));
        dlState.received += chunk.byteLength;

        if (dlState.received >= dlState.size) {
            const blob = new Blob(dlState.chunks);
            const a = UI.$el('a', { 
                href: URL.createObjectURL(blob), 
                download: dlState.name 
            });
            a.click();
            URL.revokeObjectURL(a.href);
            dlState = { name: '', size: 0, received: 0, chunks: [] };
            console.log(`[DT] Файл ${dlState.name} успешно сохранен`);
        }
    });

    // --- 5. КОМАНДЫ UI (RUN, DELETE, MKDIR, DOWNLOAD) ---
    window.fm_cmd = (act) => {
        const target = state.selected?.path || getPath();
        ctx.classList.add('hidden');
        
        if (act === 'download') API.send('DOWNLOAD', target);
        if (act === 'upload') upInput.click();
        if (act === 'run') API.send('RUN', target);
        if (act === 'delete' && confirm('Удалить объект?')) API.send('DELETE', target);
        if (act === 'mkdir') { 
            const n = prompt("Имя новой папки:"); 
            if (n) API.send('MKDIR', getPath() + '\\' + n); 
        }
    };

    upInput.onchange = async () => {
        const p = getPath();
        for (const f of upInput.files) await API.upload(f, p);
        setTimeout(() => API.send('open', p), 1000); 
        upInput.value = '';
    };

    // --- 6. НАВИГАЦИЯ ---
    // Исправленный обработчик кнопки "Назад" в initFileManager (files.js)
    $('file-back-btn').onclick = () => {
        let currentPath = getPath().trim();
        
        // Если пути нет или мы уже в "Компьютере" - запрашиваем диски
        if (!currentPath || currentPath === "Computer") {
            return API.send('list_drives');
        }

        // Убираем слеш в конце для удобства парсинга
        let p = currentPath.replace(/[\\/]$/, '');
        
        // Ищем последний разделитель пути
        const lastIdx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
        
        if (lastIdx !== -1) {
            let up = p.substring(0, lastIdx);
            // Если после обрезки осталась буква диска (например "C:"), добавляем слеш для корректности
            if (up.length === 2 && up[1] === ':') {
                up += '\\';
            }
            API.send('open', up);
        } else {
            // Если разделителей больше нет (например, были в "C:\"), выходим в корень системы
            API.send('list_drives');
        }
    };

    $('file-home-btn').onclick = () => API.send('list_drives');
    
    const viewBtn = $('file-view-btn');
    if (viewBtn) viewBtn.onclick = () => {
        viewBtn.classList.toggle('active');
        API.send(getPath() ? 'open' : 'list_drives', getPath());
    };

    body.oncontextmenu = (e) => {
        e.preventDefault();
        if (e.target === body || e.target.classList.contains('empty-notice')) {
            state.selected = null; 
            UI.showMenu(ctx, e, container, false);
        }
    };

    document.addEventListener('mousedown', e => !ctx.contains(e.target) && ctx.classList.add('hidden'), { capture: true });

    window.openFileManager = () => { 
        window.resetFileManagerPosition?.();
        state.selected = null;
        
        if (pathDisp) pathDisp.innerText = "";
        if (body) {
            body.innerHTML = '<div class="loading-status">Получение списка дисков...</div>';
        }
        
        // Явно вызываем с пустым путем, чтобы API.send отправил ""
        API.send('list_drives', ""); 
    };
};