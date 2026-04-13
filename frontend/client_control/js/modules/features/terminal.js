// frontend/client_control/js/modules/features/terminal.js
export function initTerminal() {
    const $ = id => document.getElementById(id);
    const term = $('terminal-overlay'), body = $('terminal-body'), input = $('terminal-cmd');
    const header = term.querySelector('.terminal-header');

    window.resetTerminalPosition = () => {
        ['left', 'top', 'width', 'height', 'transform'].forEach(p => term.style[p] = '');
    };

    header.onmousedown = (e) => {
        if (getComputedStyle(term).transform !== 'none') {
            const r = term.getBoundingClientRect();
            const p = term.offsetParent.getBoundingClientRect();
            term.style.left = `${r.left - p.left}px`;
            term.style.top = `${r.top - p.top}px`;
            term.style.transform = 'none';
        }

        const offX = e.clientX - term.offsetLeft;
        const offY = e.clientY - term.offsetTop;

        const move = (ev) => {
            term.style.left = `${ev.clientX - offX}px`;
            term.style.top = `${ev.clientY - offY}px`;
        };

        const stop = () => document.removeEventListener('mousemove', move);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', stop, { once: true });
    };

    input.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        const cmd = input.value.trim();
        if (!cmd) return;

        if (cmd.toLowerCase() === 'clear') {
            body.textContent = '';
            window.sendToBot?.('Terminal', JSON.stringify({ command: 'clear_process' }));
        } else {
            body.textContent += `> ${cmd}\n`;
            window.sendToBot?.('Terminal', JSON.stringify({ command: cmd }));
        }
        input.value = '';
        body.scrollTop = body.scrollHeight;
    };

    window.addEventListener('terminalOutput', ({ detail: pkg }) => {
        if (pkg.status === 'clear') body.textContent = '';
        else if (pkg.data) {
            body.textContent += pkg.data;
            body.scrollTop = body.scrollHeight;
        }
    });
}