export function initTerminal() {
    const term = document.getElementById('terminal-overlay');
    const header = term.querySelector('.terminal-header');
    const body = document.getElementById('terminal-body');
    const input = document.getElementById('terminal-cmd');

    // 1. ПЕРЕТАСКИВАНИЕ
    header.onmousedown = (e) => {
        const offsetX = e.clientX - term.offsetLeft;
        const offsetY = e.clientY - term.offsetTop;
        function moveAt(pageX, pageY) {
            term.style.left = (pageX - offsetX) + 'px';
            term.style.top = (pageY - offsetY) + 'px';
        }
        const onMouseMove = (e) => moveAt(e.pageX, e.pageY);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMouseMove), { once: true });
        e.preventDefault();
        e.stopPropagation();
    };

    // 2. ВВОД КОМАНД
    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            const cmd = input.value.trim();
            if (!cmd) return;
            
            if (cmd.toLowerCase() === 'clear') {
                body.textContent = ''; 
                input.value = '';
                // Отправляем именно clear_process
                window.sendToBot('Terminal', JSON.stringify({ command: 'clear_process' }));
                return;
            }
            
            appendOutput(`> ${cmd}\n`);
            window.sendToBot('Terminal', JSON.stringify({ command: cmd }));
            input.value = '';
        }
    });

    // 3. ОТВЕТЫ ОТ БОТА
    window.addEventListener('terminalOutput', (e) => {
        const pkg = e.detail;
        if (pkg.status === 'clear') body.textContent = '';
        else if (pkg.data) appendOutput(pkg.data);
    });

    function appendOutput(text) {
        body.textContent += text;
        body.scrollTop = body.scrollHeight;
    }
}