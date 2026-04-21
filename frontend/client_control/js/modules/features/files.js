// frontend/client_control/js/modules/features/files.js
import { FileManagerAPI as API } from './fm/FileManagerAPI.js';
import { FileManagerUI as UI } from './fm/FileManagerUI.js';

export const initFileManager = () => {
  // Инициализация хелперов и DOM-элементов
  const $ = id => document.getElementById(id);
  const body = $('files-body'), pathDisp = $('file-path-display'), term = $('files-overlay');
  const head = term?.querySelector('.terminal-header'), container = document.querySelector('.app-main') || document.body;
  const ctx = UI.$el('div', { className: 'file-context-menu hidden' }), upInput = UI.$el('input', { type: 'file', multiple: true, style: 'display:none' });
  
  let state = { selected: null, dlBuffer: [], dlName: '' };
  const getPath = () => pathDisp.innerText.trim();
  container.append(ctx, upInput);

  // --- ЛОГИКА ПОЛЯ ПУТИ ---
  if (pathDisp) {
    pathDisp.setAttribute('contenteditable', 'true');
    pathDisp.style.cursor = 'text';
    
    // Выделение текста при клике
    pathDisp.onclick = () => {
      const range = document.createRange();
      range.selectNodeContents(pathDisp);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };

    // Переход по Enter
    pathDisp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const p = getPath();
        API.send(p ? 'open' : 'list_drives', p);
        pathDisp.blur();
      }
    };
  }

  // --- ПЕРЕТАСКИВАНИЕ ОКНА ---
  if (head && term) {
    head.onmousedown = (e) => {
      if (e.target.closest('.file-nav-btn')) return;
      e.stopPropagation();
      const offX = e.clientX - term.offsetLeft, offY = e.clientY - term.offsetTop;
      const move = (ev) => { term.style.left = `${ev.clientX - offX}px`; term.style.top = `${ev.clientY - offY}px`; };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', move), { once: true });
    };
  }

  // Выполнение команд файл-менеджера
  window.fm_cmd = (act) => {
    const target = state.selected?.path || getPath();
    ctx.classList.add('hidden');
    (act === 'download') && API.send('download', target);
    (act === 'upload') && upInput.click();
    (act === 'run') && API.send('run', target);
    (act === 'delete' && confirm('Удалить?')) && API.send('delete', target);
    if (act === 'mkdir') { 
      const n = prompt("Имя папки:"); 
      n && API.send('mkdir', getPath(), { name: n }); 
    }
  };

  // Рендеринг и обработка данных от сервера
  window.renderFileSystem = (data) => {
    const { type, items, current_path, name, status, refresh } = data;
    
    if (type === "download_start") [state.dlBuffer, state.dlName] = [[], name];
    if (type === "download_finish") {
      const a = UI.$el('a', { href: URL.createObjectURL(new Blob(state.dlBuffer)), download: state.dlName });
      a.click(); state.dlBuffer = [];
    }

    if (type === "list") {
      if (document.activeElement !== pathDisp) {
        pathDisp.innerText = (current_path === "Computer" || !current_path) ? "" : current_path;
      }
      UI.renderItems(body, items, {
        onOpen: (i) => ['dir', 'directory', 'drive'].includes(i.type) && API.send('open', i.path),
        onContext: (e, i) => { state.selected = i; UI.showMenu(ctx, e, container, true); }
      });
    }
    (type === "status" && status === "success" && refresh) && API.send('open', refresh);
  };

  // Сборка стрима загрузки
  window.addEventListener('FileManager_Stream', e => e.detail && state.dlBuffer.push(new Uint8Array(e.detail)));

  // Загрузка файлов на сервер
  upInput.onchange = async () => {
    const p = getPath();
    for (const f of upInput.files) await API.upload(f, p);
    API.send('open', p); 
    upInput.value = '';
  };

  // Вызов контекстного меню на пустом месте
  body.oncontextmenu = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.target === body || e.target.classList.contains('empty-notice')) {
      state.selected = null; 
      UI.showMenu(ctx, e, container, false);
    }
  };

  // Закрытие меню при клике вне
  document.addEventListener('mousedown', e => !ctx.contains(e.target) && ctx.classList.add('hidden'), { capture: true });
  
  // Кнопка перехода на уровень вверх
  $('file-back-btn').onclick = () => {
    let p = getPath().replace(/[\\/]$/, '');
    if (!p) return API.send('list_drives');

    const lastIdx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    if (lastIdx !== -1) {
      let up = p.substring(0, lastIdx);
      (up.length === 2 && up[1] === ':') && (up += '\\');
      API.send('open', up);
    } else {
      API.send('list_drives');
    }
  };

  // Кнопки навигации и управления видом
  $('file-home-btn').onclick = () => API.send('list_drives');
  
  const viewBtn = $('file-view-btn');
  if (viewBtn) viewBtn.onclick = () => {
    viewBtn.classList.toggle('active');
    const p = getPath();
    API.send(p ? 'open' : 'list_drives', p);
  };

  // Публичный метод открытия
  window.openFileManager = () => { pathDisp.innerText = ""; API.send('list_drives'); };
};