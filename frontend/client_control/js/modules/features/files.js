// frontend/client_control/js/modules/features/files.js
import { FileManagerAPI as API } from './fm/FileManagerAPI.js';
import { FileManagerUI as UI } from './fm/FileManagerUI.js';

export const initFileManager = () => {
  const $ = id => document.getElementById(id);
  const body = $('files-body'), pathDisp = $('file-path-display'), term = $('files-overlay');
  const head = term?.querySelector('.terminal-header'), container = document.querySelector('.app-main') || document.body;
  const ctx = UI.$el('div', { className: 'file-context-menu hidden' }), upInput = UI.$el('input', { type: 'file', multiple: true, style: 'display:none' });
  let state = { history: [], selected: null, dlBuffer: [], dlName: '' };
  container.append(ctx, upInput);

  if (head && term) {
    head.onmousedown = (e) => {
      if (e.target.closest('.file-nav-btn')) return;
      e.stopPropagation();
      const offX = e.clientX - term.offsetLeft, offY = e.clientY - term.offsetTop;
      const move = (ev) => { term.style.left = `${ev.clientX - offX}px`; term.style.top = `${ev.clientY - offY}px`; };
      const stop = () => document.removeEventListener('mousemove', move);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', stop, { once: true });
    };
  }

  window.fm_cmd = (act) => {
    const target = state.selected?.path || pathDisp.innerText.trim();
    ctx.classList.add('hidden');
    if (act === 'download') API.send('download', target);
    if (act === 'upload') upInput.click();
    if (act === 'run') API.send('run', target);
    if (act === 'delete' && confirm('Удалить?')) API.send('delete', target);
    if (act === 'mkdir') { const n = prompt("Имя папки:"); n && API.send('mkdir', pathDisp.innerText.trim(), { name: n }); }
  };

  window.renderFileSystem = (data) => {
    const { type, items, current_path, name, status, refresh } = data;
    if (type === "download_start") { state.dlBuffer = []; state.dlName = name; }
    if (type === "download_finish") {
      const blob = new Blob(state.dlBuffer, { type: 'application/octet-stream' });
      const a = UI.$el('a', { href: URL.createObjectURL(blob), download: state.dlName });
      a.click(); state.dlBuffer = [];
    }
    if (type === "list") {
      pathDisp.innerText = (current_path === "Computer" || !current_path) ? "" : current_path;
      UI.renderItems(body, items, {
        onOpen: (i) => {
          if (['dir', 'directory', 'drive'].includes(i.type)) {
            state.history.push(pathDisp.innerText.trim());
            API.send('open', i.path);
          }
        },
        onContext: (e, i) => { state.selected = i; UI.showMenu(ctx, e, container, true); }
      });
    }
    if (type === "status" && status === "success" && refresh) API.send('open', refresh);
  };

  window.addEventListener('FileManager_Stream', e => { if (e.detail) state.dlBuffer.push(new Uint8Array(e.detail)); });

  pathDisp.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); const path = pathDisp.innerText.trim();
      API.send(path ? 'open' : 'list_drives', path); pathDisp.blur();
    }
  };

  upInput.onchange = async () => {
    const path = pathDisp.innerText.trim();
    for (const f of upInput.files) await API.upload(f, path);
    API.send('open', path); upInput.value = '';
  };

  body.oncontextmenu = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.target === body || e.target.classList.contains('empty-notice')) {
      state.selected = null; UI.showMenu(ctx, e, container, false);
    }
  };

  document.addEventListener('mousedown', e => !ctx.contains(e.target) && ctx.classList.add('hidden'), { capture: true });
  
  $('file-back-btn').onclick = () => state.history.length && API.send('open', state.history.pop());
  $('file-home-btn').onclick = () => { state.history = []; API.send('list_drives'); };
  
  // ЛОГИКА ГЛАЗИКА
  const viewBtn = $('file-view-btn');
  if (viewBtn) {
    viewBtn.onclick = () => {
      viewBtn.classList.toggle('active');
      const path = pathDisp.innerText.trim();
      API.send(path ? 'open' : 'list_drives', path);
    };
  }

  window.openFileManager = () => { state.history = []; API.send('list_drives'); };
};