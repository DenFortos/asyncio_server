// frontend\client_control\js\modules\features\terminal.js

export function initTerminal() {
    const term = document.getElementById('terminal-overlay');
    const body = document.getElementById('terminal-body');
    const input = document.getElementById('terminal-cmd');
    const header = term.querySelector('.terminal-header');

    // Перетаскивание
    header.onmousedown = (e) => {
        const offsetX = e.clientX - term.offsetLeft;
        const offsetY = e.clientY - term.offsetTop;
        const onMouseMove = (ev) => {
            term.style.left = (ev.pageX - offsetX) + 'px';
            term.style.top = (ev.pageY - offsetY) + 'px';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMouseMove), { once: true });
    };

    // Ввод команд
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value.trim();
            if (!cmd) return;
            
            if (cmd.toLowerCase() === 'clear') {
                body.textContent = '';
                // Обязательно JSON.stringify, чтобы бэкенд получил строку, а не [object Object]
                window.sendToBot('Terminal', JSON.stringify({ command: 'clear_process' }));
            } else {
                body.textContent += `> ${cmd}\n`;
                // Обязательно JSON.stringify здесь тоже
                window.sendToBot('Terminal', JSON.stringify({ command: cmd }));
            }
            input.value = '';
            body.scrollTop = body.scrollHeight;
        }
    });

    // Вывод данных
    window.addEventListener('terminalOutput', (e) => {
        const pkg = e.detail;
        if (pkg.status === 'clear') body.textContent = '';
        else if (pkg.data) {
            body.textContent += pkg.data;
            body.scrollTop = body.scrollHeight;
        }
    });
}