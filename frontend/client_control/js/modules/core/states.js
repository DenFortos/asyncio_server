/* frontend/client_control/js/modules/core/states.js */

window.AppState = {
    clientId: new URLSearchParams(window.location.search).get('id'),
    info: { ip: '0.0.0.0', status: 'offline' },
    desktop: { observe: false, control: false },
    webcam: { active: false },
    audio: { input: false, output: false },

    // Функция тотальной зачистки
    reset() {
        this.desktop = { observe: false, control: false };
        this.webcam.active = false;
        this.audio = { input: false, output: false };

        // Визуально гасим всё
        document.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));

        const dot = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        if (dot) dot.classList.remove('online');
        if (text) text.textContent = 'offline';
    }
};

// Запускаем сброс немедленно при парсинге файла
window.AppState.reset();