// frontend/client_control/js/modules/features/files.js
import { FileManagerAPI as API } from './fm/FileManagerAPI.js';
import { FileManagerUI as UI } from './fm/FileManagerUI.js';

// Инициализация файлового менеджера: управление файлами, навигация и контекстное меню
export const initFileManager = () => {
  const $ = id => document.getElementById(id);
  const body = $('files-body'), pathDisp = $('file-path-display'), term = $('files-overlay');
  const head = term?.querySelector('.terminal-header'), container = document.querySelector('.app-main') || document.body;
  const ctx = UI.$el('div', { className: 'file-context-menu hidden' }), upInput = UI.$el('input', { type: 'file', multiple: true, style: 'display:none' });
  let state = { history: [], selected: null, dlBuffer: [], dlName: '' };
  
  [ctx, upInput].forEach(el => container.append(el));
  Object.assign(pathDisp, { contentEditable: "true", spellcheck: false });

  // Глобальная блокировка событий для предотвращения проброса на видео-стрим
  ['mousedown', 'mouseup', 'click', 'wheel'].forEach(t => term.addEventListener(t, e => e.stopPropagation(), { passive: false }));

  // Сброс позиции окна в исходное состояние
  window.resetFilesPosition = () => ['left', 'top', 'width', 'height', 'transform'].forEach(p => term.style[p] = '');

  // Выполнение команд файлового менеджера (удаление, загрузка, запуск)
  window.fm_cmd = (act) => {
    const target = state.selected?.path || pathDisp.textContent;
    ctx.classList.add('hidden');
    
    if (act === 'download') API.send('download', target);
    if (act === 'upload') upInput.click();
    if (act === 'run') API.send('execute', target);
    if (act === 'mkdir') {
      const n = prompt("Имя папки:");
      n && API.send('mkdir', pathDisp.textContent, { name: n });
    }
    if (act === 'delete' && confirm('Удалить?')) API.send('delete', target);
  };

  // Обработка и рендеринг данных файловой системы от бота
  window.renderFileSystem = (data) => {
    const { type, items, current_path, name, status, refresh } = data;

    if (type === "download_start") [state.dlBuffer, state.dlName] = [[], name];
    else if (type === "download_finish") {
      const a = UI.$el('a', { href: URL.createObjectURL(new Blob(state.dlBuffer)), download: state.dlName });
      a.click();
      state.dlBuffer = [];
    }
    else if (type === "list") {
      pathDisp.textContent = current_path || "Computer";
      UI.renderItems(body, items, {
        onOpen: (i) => i.type !== 'file' && (state.history.push(pathDisp.textContent), API.send('open', i.path)),
        onContext: (e, i) => { state.selected = i; UI.showMenu(ctx, e, container, true); }
      });
    }
    (type === "status" && status === "success" && refresh) && API.send('open', refresh);
  };

  // Обработка перехода по пути при нажатии Enter
  pathDisp.onkeydown = (e) => {
    e.stopPropagation(); 
    if (e.key === 'Enter') {
      e.preventDefault();
      const path = pathDisp.textContent.trim();
      path && API.send('open', path);
      pathDisp.blur();
    }
  };

  window.addEventListener('FileManager_Stream', e => state.dlBuffer.push(e.detail));

  // Загрузка выбранных файлов на сервер
  upInput.onchange = async () => {
    for (const f of upInput.files) await API.upload(f, pathDisp.textContent);
    API.send('open', pathDisp.textContent);
    upInput.value = '';
  };

  // Перетаскивание окна файлового менеджера
  head.onmousedown = (e) => {
    if (e.target.closest('.file-nav-btn')) return;
    e.stopPropagation();

    const [offX, offY] = [e.clientX - term.offsetLeft, e.clientY - term.offsetTop];
    
    const move = (ev) => {
      ev.stopPropagation();
      [term.style.left, term.style.top] = [`${ev.clientX - offX}px`, `${ev.clientY - offY}px`];
    };

    const stop = () => document.removeEventListener('mousemove', move, true);

    document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseup', stop, { once: true, capture: true });
  };

  // Контекстное меню для пустого пространства
  body.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === body || e.target.classList.contains('empty-notice')) {
      state.selected = null;
      UI.showMenu(ctx, e, container, false);
    }
  };

  document.addEventListener('mousedown', e => !ctx.contains(e.target) && ctx.classList.add('hidden'), { capture: true });

  // Кнопки навигации: Назад, Домой, Обновить
  $('file-back-btn').onclick = (e) => { e.stopPropagation(); state.history.length && API.send('open', state.history.pop()); };
  $('file-home-btn').onclick = (e) => { e.stopPropagation(); state.history = []; API.send('list_drives'); };
  $('file-view-btn').onclick = (e) => { e.stopPropagation(); API.send('open', pathDisp.textContent); };
  
  window.openFileManager = () => { window.resetFilesPosition(); state.history = []; API.send('list_drives'); };
};