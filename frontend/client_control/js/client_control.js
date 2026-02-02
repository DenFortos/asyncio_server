// js/client_control.js

console.log("--> client_control.js инициализирован");

document.addEventListener('DOMContentLoaded', () => {
    initClientUI();
    AppState.reset();

    // Сайдбар и переключение вкладок
    const icons = document.querySelectorAll('.icon[data-function]');
    icons.forEach(icon => {
        icon.onclick = () => {
            const fn = icon.dataset.function;

            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            if (['desktop', 'webcam'].includes(fn)) switchView(fn);
            if (fn.startsWith('audio-')) toggleAudio(fn.split('-')[1]);
        };
    });

    // Кнопки управления
    document.getElementById('observeBtn').onclick = toggleObserve;
    document.getElementById('controlBtn').onclick = toggleControl;
    document.getElementById('webcamToggleBtn').onclick = toggleWebcam;

    if (window.initControlConnection) initControlConnection();
});