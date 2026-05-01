// frontend/client_control/js/modules/core/states.js

/** Глобальный стейт приложения под протокол V8.0 **/
export const AppState = {
  clientId: new URLSearchParams(window.location.search).get('id'),
  desktop: { observe: false, control: false },
  webcam: { active: false },
  audio: { input: false, output: false },
  lastSystemData: null,

  /** Полный сброс состояния при смене клиента или ошибке **/
  reset() {
    const $ = id => document.getElementById(id);
    const [dot, txt] = [$('status-indicator'), $('status-text')];

    // Сброс логики
    this.desktop = { observe: false, control: false };
    this.webcam.active = false;
    this.audio = { input: false, output: false };
    this.lastSystemData = null;

    // Сброс UI
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.stream-overlay').forEach(o => o.style.display = 'flex');

    dot?.classList.remove('online');
    txt && (txt.textContent = 'offline');

    console.log(`[State] Reset for client: ${this.clientId}`);
  }
};

window.AppState = AppState;