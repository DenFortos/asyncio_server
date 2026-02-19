/* frontend/client_control/js/modules/core/states.js */

/* ==========================================================================
   1. ОБЪЕКТ СОСТОЯНИЯ (Application State)
========================================================================== */

export const AppState = {
    // Извлекаем ID бота напрямую из URL при загрузке
    clientId: new URLSearchParams(window.location.search).get('id'),

    desktop: { observe: false, control: false },
    webcam: { active: false },
    audio: { input: false, output: false },

    /* ==========================================================================
       2. МЕТОДЫ УПРАВЛЕНИЯ (State Management)
    ========================================================================== */

    /** Сброс всех активных сессий и визуальных индикаторов */
    reset() {
        this.desktop = { observe: false, control: false };
        this.webcam.active = false;
        this.audio = { input: false, output: false };

        // Визуальная очистка: кнопки
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));

        // Визуальная очистка: оверлеи заглушки
        document.querySelectorAll('.stream-overlay').forEach(o => o.style.display = 'flex');

        // Сброс индикатора статуса в шапке
        const dot = document.getElementById('status-indicator');
        const txt = document.getElementById('status-text');

        if (dot) dot.classList.remove('online');
        if (txt) txt.textContent = 'offline';

        console.log("[State] Cleared for:", this.clientId);
    }
};

// Глобальный доступ для отладки из консоли
window.AppState = AppState;