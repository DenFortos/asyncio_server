// frontend/client_control/js/modules/features/terminal.js

// Инициализация интерактивного терминала: управление вводом, выводом и перемещением окна
export const initTerminal = () => {
  const $ = id => document.getElementById(id);
  const term = $('terminal-overlay'), body = $('terminal-body'), input = $('terminal-cmd');
  const head = term?.querySelector('.terminal-header');

  if (!term || !input) return;

  // Изоляция событий мыши для предотвращения проброса кликов на стрим
  ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach(type => {
    term.addEventListener(type, (e) => {
      e.stopPropagation();
      (type === 'mousedown' && e.target !== input) && setTimeout(() => input.focus(), 0);
    });
  });

  // Сброс координат и размеров окна терминала в исходное состояние
  window.resetTerminalPosition = () => {
    ['left', 'top', 'width', 'height', 'transform'].forEach(p => term.style[p] = '');
  };

  // Реализация перетаскивания окна терминала за заголовок
  head.onmousedown = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (getComputedStyle(term).transform !== 'none') {
      const r = term.getBoundingClientRect();
      const p = term.offsetParent.getBoundingClientRect();
      [term.style.left, term.style.top, term.style.transform] = [`${r.left - p.left}px`, `${r.top - p.top}px`, 'none'];
    }

    const [offX, offY] = [e.clientX - term.offsetLeft, e.clientY - term.offsetTop];

    const move = (ev) => {
      ev.stopPropagation();
      [term.style.left, term.style.top] = [`${ev.clientX - offX}px`, `${ev.clientY - offY}px`];
    };

    const stop = (ev) => {
      ev.stopPropagation();
      document.removeEventListener('mousemove', move, true);
    };

    document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseup', stop, { once: true, capture: true });
  };

  // Обработка команд терминала и отправка их боту
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key !== 'Enter') return;

    const cmd = input.value.trim();
    if (!cmd) return;

    const isClear = cmd.toLowerCase() === 'clear';
    const payload = isClear ? { command: 'clear_process' } : { command: cmd };

    isClear ? (body.textContent = '') : (body.textContent += `> ${cmd}\n`);
    window.sendToBot?.('Terminal', JSON.stringify(payload));
    
    input.value = '';
    body.scrollTop = body.scrollHeight;
  });

  // Предотвращение всплытия событий клавиш для исключения конфликтов с input_handler
  ['keyup', 'keypress'].forEach(type => input.addEventListener(type, e => e.stopPropagation()));

  // Обработка входящих данных от удаленного терминала
  window.addEventListener('terminalOutput', ({ detail: pkg }) => {
    if (pkg.status === 'clear') body.textContent = '';
    else if (pkg.data) {
      body.textContent += pkg.data;
      body.scrollTop = body.scrollHeight;
    }
  });
};