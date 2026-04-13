export function initFileManager() {
    const $ = id => document.getElementById(id);
    const term = $('files-overlay'), body = $('files-body'), pathDisplay = $('file-path-display');
    const viewToggleBtn = $('file-view-btn'), header = term.querySelector('.terminal-header');
    
    let pathHistory = [], fileCache = {}, showHidden = false;

    const sendRequest = (action, path) => {
        window.sendToBot?.('FileManager', JSON.stringify({ action, path, show_hidden: showHidden }));
    };

    const updateView = (pathKey, items) => {
        body.innerHTML = items?.length ? '' : '<div style="grid-column:1/-1;text-align:center;opacity:0.3;padding:40px;">Empty</div>';
        pathDisplay.textContent = pathKey;
        items?.forEach(item => {
            const isDir = item.type === 'directory', icon = item.type === 'drive' ? 'fa-hard-drive' : (isDir ? 'fa-folder' : 'fa-file');
            const div = document.createElement('div');
            div.className = `file-item ${item.type} ${item.is_hidden ? 'file-hidden' : ''}`;
            div.innerHTML = `<i class="fas ${icon}"></i><div class="file-name" title="${item.name}">${item.name}</div>${item.size ? `<span class="file-size-tag">${item.size}</span>` : ''}`;
            div.onclick = () => item.type !== 'file' && (pathHistory.push(pathDisplay.textContent), sendRequest('open', item.path));
            body.appendChild(div);
        });
    };

    window.openFileManager = () => {
        [pathHistory, fileCache, showHidden] = [[], {}, false];
        viewToggleBtn?.classList.remove('active');
        body.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:40px;">Loading...</div>';
        pathDisplay.textContent = 'Computer';
        sendRequest('list_drives');
    };

    if (viewToggleBtn) {
        viewToggleBtn.onclick = () => {
            showHidden = !showHidden;
            viewToggleBtn.classList.toggle('active', showHidden);
            const cur = pathDisplay.textContent;
            cur !== 'Computer' && sendRequest('open', cur);
        };
    }

    window.renderFileSystem = (data) => {
        if (!data) return;
        const { current_path, items, show_hidden } = data, key = current_path || "Computer";
        if (show_hidden !== undefined) viewToggleBtn?.classList.toggle('active', showHidden = show_hidden);
        fileCache[key] = data;
        updateView(key, items);
    };

    $('file-back-btn').onclick = () => {
        if (!pathHistory.length) return;
        const prev = pathHistory.pop();
        sendRequest(prev === "Computer" ? "list_drives" : "open", prev);
    };

    $('file-home-btn').onclick = window.openFileManager;

    header.onmousedown = (e) => {
        if (e.target.closest('.file-nav-btn')) return;
        
        const rect = term.getBoundingClientRect();
        const offX = e.clientX - rect.left;
        const offY = e.clientY - rect.top;

        // МГНОВЕННЫЙ ФИКС: синхронизируем стили с реальным положением до события mousemove
        term.style.margin = '0';
        term.style.transform = 'none';
        term.style.position = 'fixed';
        term.style.left = `${rect.left}px`;
        term.style.top = `${rect.top}px`;

        const move = (ev) => {
            term.style.left = `${ev.clientX - offX}px`;
            term.style.top = `${ev.clientY - offY}px`;
        };

        const stop = () => document.removeEventListener('mousemove', move);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop, { once: true });
    };
}