// frontend/client_control/js/modules/websocket/controller.js
import { initControlConnection } from './connection.js';
import { toggleFeature } from '../ui/controller.js'; // Поднимаемся на уровень выше к папке ui

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AppState !== 'undefined' && AppState.reset) AppState.reset();

    initControlConnection();

    // Экспортируем функции в window, чтобы они были видны кнопкам
    window.toggleObserve = () =>
        toggleFeature('observeBtn', AppState.desktop, 'observe', 'Desktop', ['start_stream', 'stop_stream'], window.clearDesktopUI);

    window.toggleControl = () =>
        toggleFeature('controlBtn', AppState.desktop, 'control', 'Desktop', ['start_control', 'stop_control']);

    window.toggleWebcam = () =>
        toggleFeature('webcamToggleBtn', AppState.webcam, 'active', 'Webcam', ['start', 'stop'], window.stopWebcamUI);

    // Сайдбар и кнопки
    document.querySelectorAll('.icon[data-function]').forEach(icon => {
        icon.onclick = () => {
            const fn = icon.dataset.function;
            document.querySelectorAll('.icon').forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            if (['desktop', 'webcam'].includes(fn)) window.switchView(fn);
        };
    });

    document.getElementById('observeBtn')?.addEventListener('click', window.toggleObserve);
    document.getElementById('controlBtn')?.addEventListener('click', window.toggleControl);
    document.getElementById('webcamToggleBtn')?.addEventListener('click', window.toggleWebcam);
});