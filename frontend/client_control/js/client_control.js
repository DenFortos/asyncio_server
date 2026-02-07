// frontend/client_control/js/client_control.js

import { initControlConnection } from './modules/websocket/connection.js';
import { toggleFeature, switchView } from './ui_logic.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.initClientUI) window.initClientUI();
    if (window.AppState && window.AppState.reset) window.AppState.reset();

    initControlConnection();

    // Глобальные функции (используют новые имена модулей бэкенда)
    window.toggleObserve = () => toggleFeature('observeBtn', AppState.desktop, 'observe', 'ScreenWatch', ['start_stream', 'stop_stream'], window.clearDesktopUI);
    window.toggleControl = () => toggleFeature('controlBtn', AppState.desktop, 'control', 'InputForge', ['start_control', 'stop_control']);
    window.toggleWebcam = () => toggleFeature('webcamToggleBtn', AppState.webcam, 'active', 'CamGaze', ['start', 'stop'], window.stopWebcamUI);
    window.switchView = switchView;

    // Обработка сайдбара
    document.querySelectorAll('.icon[data-function]').forEach(icon => {
        icon.onclick = () => {
            const fn = icon.dataset.function;
            if (['desktop', 'webcam'].includes(fn)) {
                document.querySelectorAll('.icon').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                window.switchView(fn);
            } else if (fn.startsWith('audio-')) {
                window.toggleAudio?.(fn.split('-')[1]);
            }
        };
    });

    // Слушатели событий
    document.getElementById('observeBtn')?.addEventListener('click', window.toggleObserve);
    document.getElementById('controlBtn')?.addEventListener('click', window.toggleControl);
    document.getElementById('webcamToggleBtn')?.addEventListener('click', window.toggleWebcam);
});