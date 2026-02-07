// frontend/client_control/js/client_control.js

import { initControlConnection } from './modules/websocket/connection.js';
import { toggleFeature, switchView } from './ui_logic.js';

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация базового состояния
    if (window.initClientUI) window.initClientUI();
    if (window.AppState && window.AppState.reset) window.AppState.reset();

    initControlConnection();

    // 1. Привязываем функции к window
    window.toggleObserve = () => toggleFeature('observeBtn', AppState.desktop, 'observe', 'Desktop', ['start_stream', 'stop_stream'], window.clearDesktopUI);
    window.toggleControl = () => toggleFeature('controlBtn', AppState.desktop, 'control', 'Desktop', ['start_control', 'stop_control']);
    window.toggleWebcam = () => toggleFeature('webcamToggleBtn', AppState.webcam, 'active', 'Webcam', ['start', 'stop'], window.stopWebcamUI);
    window.switchView = switchView;

    // 2. Обработка кликов Сайдбара
    document.querySelectorAll('.icon[data-function]').forEach(icon => {
        icon.onclick = () => {
            const fn = icon.dataset.function;
            if (['desktop', 'webcam'].includes(fn)) {
                document.querySelectorAll('.icon[data-function="desktop"], .icon[data-function="webcam"]').forEach(i => i.classList.remove('active'));
                icon.classList.add('active');
                window.switchView(fn);
            } else if (fn.startsWith('audio-')) {
                if (window.toggleAudio) window.toggleAudio(fn.split('-')[1]);
            }
        };
    });

    // 3. Привязка кнопок управления
    const obsBtn = document.getElementById('observeBtn');
    if (obsBtn) obsBtn.addEventListener('click', window.toggleObserve);

    const ctrlBtn = document.getElementById('controlBtn');
    if (ctrlBtn) ctrlBtn.addEventListener('click', window.toggleControl);

    const camBtn = document.getElementById('webcamToggleBtn');
    if (camBtn) camBtn.addEventListener('click', window.toggleWebcam);
});