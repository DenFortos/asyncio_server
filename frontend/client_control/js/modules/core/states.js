// frontend/client_control/js/modules/core/states.js

// Глобальный объект состояния приложения и методы его сброса
export const AppState = {
  // Извлечение ID целевого клиента из параметров URL
  clientId: new URLSearchParams(window.location.search).get('id'),

  desktop: { observe: false, control: false },
  webcam: { active: false },
  audio: { input: false, output: false },

  // Полный сброс всех флагов состояния и очистка UI индикаторов
  reset() {
    const $ = id => document.getElementById(id);
    const [dot, txt] = [$('status-indicator'), $('status-text')];

    // Сброс логических состояний
    this.desktop = { observe: false, control: false };
    this.webcam.active = false;
    this.audio = { input: false, output: false };

    // Массовая очистка визуальных компонентов
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.stream-overlay').forEach(o => o.style.display = 'flex');

    // Обновление статуса подключения в шапке
    dot?.classList.remove('online');
    txt && (txt.textContent = 'offline');

    console.log("[State] Cleared for:", this.clientId);
  }
};

// Регистрация в глобальном пространстве имен для отладки
window.AppState = AppState;