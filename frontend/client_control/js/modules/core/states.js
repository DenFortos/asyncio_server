/* frontend/client_control/js/modules/core/states.js */
export const AppState = {
    clientId: new URLSearchParams(window.location.search).get('id'),
    desktop: { observe: false, control: false },
    webcam: { active: false },
    audio: { input: false, output: false },

    reset() {
        this.desktop = { observe: false, control: false };
        this.webcam.active = false;
        this.audio = { input: false, output: false };

        // Сброс активных кнопок
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));

        // Сброс оверлеев (надписей "Stream Offline")
        document.querySelectorAll('.stream-overlay').forEach(o => o.style.display = 'flex');

        // Сброс индикатора статуса напрямую
        const dot = document.getElementById('status-indicator');
        const txt = document.getElementById('status-text');

        if (dot) dot.classList.remove('online');
        if (txt) txt.textContent = 'offline';

        console.log("[State] Cleared for:", this.clientId);
    }
};

window.AppState = AppState;