// frontend\client_control\js\modules\features\terminal.js

/**
 * Модуль терминала PowerShell (V7.2)
 * Работа через Анонсы (Powershell:None).
 */
export const initTerminal = () => {
    const $ = id => document.getElementById(id);
    const term = $('terminal-overlay'), body = $('terminal-body'), input = $('terminal-cmd');
    const head = term?.querySelector('.terminal-header');

    if (!term || !input || !body) return;

    // --- 1. ИЗОЛЯЦИЯ И ВЫДЕЛЕНИЕ ТЕКСТА ---
    body.style.userSelect = 'text';
    body.style.webkitUserSelect = 'text';

    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach(type => {
        term.addEventListener(type, (e) => {
            e.stopPropagation();
            if (type === 'mousedown' && e.target !== input && !body.contains(e.target)) {
                setTimeout(() => input.focus(), 0);
            }
        });
    });

    body.addEventListener('mousedown', (e) => e.stopPropagation());

    // --- 2. DRAG & DROP (С поддержкой сброса transform) ---
    if (head) {
        head.style.cursor = 'move';
        head.onmousedown = (e) => {
            e.stopPropagation();
            if (getComputedStyle(term).transform !== 'none') {
                const r = term.getBoundingClientRect();
                const p = term.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
                term.style.left = `${r.left - p.left}px`;
                term.style.top = `${r.top - p.top}px`;
                term.style.transform = 'none';
                term.style.margin = '0';
            }
            const offX = e.clientX - term.offsetLeft, offY = e.clientY - term.offsetTop;
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

    // --- 3. ОТПРАВКА КОМАНД (Анонс JSON) ---
    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key !== 'Enter') return;

        const cmd = input.value.trim();
        if (!cmd) return;

        if (cmd.toLowerCase() === 'clear') {
            body.textContent = '';
            window.sendToBot?.('Powershell:None', { action: 'clear' });
        } else {
            body.textContent += `> ${cmd}\n`;
            // V7.2: window.sendToBot сам превратит объект в JSON и упакует в 4b Size
            window.sendToBot?.('Powershell:None', { action: 'execute', command: cmd });
        }
        input.value = '';
        body.scrollTop = body.scrollHeight;
    });

    ['keyup', 'keypress'].forEach(type => input.addEventListener(type, e => e.stopPropagation()));

    // --- 4. ПРИЕМ ОТВЕТА (Событие от connection.js) ---
    window.addEventListener('Powershell:None', ({ detail: payload }) => {
        // detail — это уже распарсенный JSON или строка из connection.js
        let incoming = payload;

        // Если пришла строка (сырой вывод), нормализуем в объект
        if (typeof incoming === 'string') {
            try {
                incoming = JSON.parse(incoming);
            } catch (e) {
                incoming = { data: incoming };
            }
        }

        if (incoming.status === 'clear' || incoming.action === 'clear') {
            body.textContent = '';
        } else if (incoming.data) {
            // Добавляем текст в терминал
            body.textContent += incoming.data;
            body.scrollTop = body.scrollHeight;
        }
    });

    window.resetTerminalPosition = () => {
        ['left', 'top', 'width', 'height', 'transform', 'margin'].forEach(p => term.style[p] = '');
    };
};