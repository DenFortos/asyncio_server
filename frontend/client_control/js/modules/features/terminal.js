// frontend\client_control\js\modules\features\terminal.js

/**
 * Модуль терминала PowerShell (V8.0)
 * Протокол связи: Powershell:json:none:none
 * Поддержка многострочного ввода (textarea)
 */
export const initTerminal = () => {
    const $ = id => document.getElementById(id);
    const term = $('terminal-overlay'), 
          body = $('terminal-body'), 
          input = $('terminal-cmd'); // Теперь это <textarea>
    const head = term?.querySelector('.terminal-header');

    if (!term || !input || !body) return;

    // --- 1. СТИЛИЗАЦИЯ ВЫВОДА ---
    body.style.whiteSpace = 'pre-wrap'; // Разрешаем перенос слишком длинных строк
    body.style.fontFamily = "'Consolas', 'Monaco', monospace";
    body.style.wordBreak = 'break-all';
    body.style.overflowY = 'auto';

    // --- 2. УПРАВЛЕНИЕ ВЫСОТОЙ TEXTAREA ---
    const updateInputHeight = () => {
        input.style.height = 'auto';
        const maxHeight = 200; // Лимит высоты в пикселях
        const newHeight = Math.min(input.scrollHeight, maxHeight);
        
        input.style.height = `${newHeight}px`;
        
        // Если контент больше лимита — включаем скролл, иначе скрываем
        input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    input.addEventListener('input', updateInputHeight);

    // --- 3. ИЗОЛЯЦИЯ И ФОКУС ---
    body.style.userSelect = 'text';
    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach(type => {
        term.addEventListener(type, (e) => {
            e.stopPropagation();
            if (type === 'mousedown' && e.target !== input && !body.contains(e.target)) {
                setTimeout(() => input.focus(), 0);
            }
        });
    });

    // --- 4. DRAG & DROP ---
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
            
            const offX = e.clientX - term.offsetLeft, 
                  offY = e.clientY - term.offsetTop;

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

    // --- 5. ОТПРАВКА КОМАНД ---
    input.addEventListener('keydown', (e) => {
        // Shift + Enter = обычный перенос строки в textarea
        if (e.key === 'Enter' && e.shiftKey) return;

        // Enter без Shift = отправка
        if (e.key === 'Enter') {
            e.preventDefault(); // Запрещаем перенос строки
            e.stopPropagation();

            const cmd = input.value.trim();
            if (!cmd) return;

            if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
                body.textContent = '';
                window.sendToBot?.('Powershell', { action: 'clear' }, 'none');
            } else {
                // Отображаем вводимую команду в теле терминала
                body.textContent += `\n> ${cmd}\n`;
                window.sendToBot?.('Powershell', { action: 'execute', command: cmd }, 'none');
            }

            input.value = '';
            updateInputHeight(); // Сбрасываем высоту до начальной
            body.scrollTop = body.scrollHeight;
        }
    });

    ['keyup', 'keypress'].forEach(type => input.addEventListener(type, e => e.stopPropagation()));

    // --- 6. ПРИЕМ ОТВЕТА ---
    window.addEventListener('Powershell:none', ({ detail: payload }) => {
        let incoming = payload;

        if (typeof incoming === 'string') {
            try { 
                incoming = JSON.parse(incoming); 
            } catch (e) { 
                incoming = { data: incoming }; 
            }
        }

        if (incoming.status === 'clear' || incoming.action === 'clear') {
            body.textContent = '';
        } 
        else if (incoming.data) {
            body.textContent += incoming.data;
            body.scrollTop = body.scrollHeight;
        }
    });

    window.resetTerminalPosition = () => {
        ['left', 'top', 'width', 'height', 'transform', 'margin'].forEach(p => term.style[p] = '');
    };
};