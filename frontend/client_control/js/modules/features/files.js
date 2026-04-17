// frontend/client_control/js/modules/features/files.js
import { FileManagerAPI as API } from './fm/FileManagerAPI.js';
import { FileManagerUI as UI } from './fm/FileManagerUI.js';

// Инициализация менеджера: события, навигация и управление DOM
export const initFileManager = () => {
  const $ = id => document.getElementById(id);
  const body = $('files-body'), pathDisp = $('file-path-display'), term = $('files-overlay');
  const head = term?.querySelector('.terminal-header'), container = document.querySelector('.app-main') || document.body;
  const ctx = UI.$el('div', { className: 'file-context-menu hidden' }), upInput = UI.$el('input', { type: 'file', multiple: true, style: 'display:none' });
  let state = { history: [], selected: null, dlBuffer: [], dlName: '' };
  
  [ctx, upInput].forEach(el => container.append(el));
  Object.assign(pathDisp, { contentEditable: "true", spellcheck: false, innerText: "" });

  // Блокировка проброса событий на фоновые элементы
  ['mousedown', 'mouseup', 'click', 'wheel'].forEach(t => term.addEventListener(t, e => e.stopPropagation(), { passive: false }));

  // Сброс координат окна
  window.resetFilesPosition = () => ['left', 'top', 'width', 'height', 'transform'].forEach(p => term.style[p] = '');

  // Вызов системных команд (delete, run, download, mkdir, upload)
  window.fm_cmd = (act) => {
    const target = state.selected?.path || pathDisp.innerText.trim();
    ctx.classList.add('hidden');
    
    act === 'download' && API.send('download', target);
    act === 'upload' && upInput.click();
    act === 'run' && API.send('execute', target);
    act === 'delete' && confirm('Удалить?') && API.send('delete', target);
    if (act === 'mkdir') {
      const n = prompt("Имя папки:");
      n && API.send('mkdir', pathDisp.innerText.trim(), { name: n });
    }
  };

  // Обработка ответов от бота и отрисовка содержимого
  window.renderFileSystem = (data) => {
    const { type, items, current_path, name, status, refresh } = data;

    if (type === "download_start") [state.dlBuffer, state.dlName] = [[], name];
    if (type === "download_finish") {
      const a = UI.$el('a', { href: URL.createObjectURL(new Blob(state.dlBuffer)), download: state.dlName });
      a.click();
      state.dlBuffer = [];
    }
    if (type === "list") {
      // Убираем "Computer", оставляя пустую строку для корневого раздела
      pathDisp.innerText = current_path === "Computer" ? "" : (current_path || "");
      UI.renderItems(body, items, {
        onOpen: (i) => i.type !== 'file' && (state.history.push(pathDisp.innerText.trim()), API.send('open', i.path)),
        onContext: (e, i) => { state.selected = i; UI.showMenu(ctx, e, container, true); }
      });
    }
    (type === "status" && status === "success" && refresh) && API.send('open', refresh);
  };

  // Обработка ручного ввода пути и поиска по Enter
  pathDisp.onkeydown = (e) => {
    e.stopPropagation(); 
    if (e.key === 'Enter') {
      e.preventDefault();
      const path = pathDisp.innerText.trim();
      // Если путь пустой — запрашиваем диски
      !path ? API.send('list_drives') : API.send('open', path);
      pathDisp.blur();
    }
  };

  // Наполнение буфера при потоковой загрузке
  window.addEventListener('FileManager_Stream', e => state.dlBuffer.push(e.detail));

  // Инициализация загрузки файлов на сервер
  upInput.onchange = async () => {
    const path = pathDisp.innerText.trim();
    for (const f of upInput.files) await API.upload(f, path);
    API.send('open', path);
    upInput.value = '';
  };

  // Логика перемещения окна проводника
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

  // Контекстное меню для рабочей области
  body.oncontextmenu = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.target === body || e.target.classList.contains('empty-notice')) {
      state.selected = null;
      UI.showMenu(ctx, e, container, false);
    }
  };

  // Скрытие меню при клике вне его области
  document.addEventListener('mousedown', e => !ctx.contains(e.target) && ctx.classList.add('hidden'), { capture: true });

  // Обработчики кнопок навигационной панели
  $('file-back-btn').onclick = (e) => { e.stopPropagation(); state.history.length && API.send('open', state.history.pop()); };
  $('file-home-btn').onclick = (e) => { e.stopPropagation(); state.history = []; API.send('list_drives'); };
  $('file-view-btn').onclick = (e) => { 
    e.stopPropagation(); 
    e.currentTarget.classList.toggle('active');
    API.send('open', pathDisp.innerText.trim()); 
  };
  
  // Глобальная функция открытия модуля
  window.openFileManager = () => { window.resetFilesPosition(); state.history = []; API.send('list_drives'); };
};