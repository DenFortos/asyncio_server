/**
 * Контроллер интерфейса: управление логикой кнопок, вкладок и рендерингом потоков
 */

// --- Вспомогательные функции (Хелперы) ---

/**
 * Универсальная отрисовка MJPEG потока через Blob
 */
window.renderStream = (id, payload, containerSelector, placeholderId) => {
    let img = document.getElementById(id);

    // Создаем img, если его еще нет в контейнере
    if (!img) {
        img = document.createElement('img');
        img.id = id;
        img.className = id === 'remoteScreen' ? 'desktop-feed' : 'webcam-feed';
        const container = document.querySelector(containerSelector);
        if (container) container.appendChild(img);
    }

    // Создаем URL из байтов
    const url = URL.createObjectURL(new Blob([payload], { type: 'image/jpeg' }));
    const oldUrl = img.src;

    img.src = url;
    img.style.display = 'block';

    // Прячем заглушку (Loading/Placeholder)
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) placeholder.style.display = 'none';

    // Освобождаем память от старого кадра
    if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
};

/**
 * Универсальный переключатель состояний для кнопок управления
 */
const toggleFeature = (id, stateObj, key, mod, cmds, onStop) => {
    stateObj[key] = !stateObj[key];
    const state = stateObj[key];

    const btn = document.getElementById(id);
    if (btn) {
        // Динамически формируем имя класса (например, observe-on, webcam-off)
        const type = id.replace(/Btn|Toggle/g, '').toLowerCase();
        btn.className = `control-btn ${type}-${state ? 'on' : 'off'}`;

        const span = btn.querySelector('span');
        if (span) span.textContent = state ? 'ON' : 'OFF';
    }

    // Отправка команды боту через основной мессенджер
    if (window.sendToBot) {
        sendToBot(mod, state ? cmds[0] : cmds[1]);
    }

    // Вызов функции очистки UI, если она передана (при выключении)
    if (!state && typeof onStop === 'function') onStop();
};

// --- Глобальные методы управления ---

window.switchView = (view) => {
    const isDesk = view === 'desktop', isCam = view === 'webcam';

    document.getElementById('desktopContainer').style.display = isDesk ? 'flex' : 'none';
    document.getElementById('webcamContainer').style.display = isCam ? 'flex' : 'none';

    // Авто-стоп функций при уходе с вкладки для экономии трафика
    if (!isDesk) {
        if (AppState.desktop.observe) window.toggleObserve();
        if (AppState.desktop.control) window.toggleControl();
    }
    if (!isCam && AppState.webcam.active) window.toggleWebcam();
};

window.toggleObserve = () =>
    toggleFeature('observeBtn', AppState.desktop, 'observe', 'Desktop', ['start_stream', 'stop_stream'], window.clearDesktopUI);

window.toggleControl = () =>
    toggleFeature('controlBtn', AppState.desktop, 'control', 'Desktop', ['start_control', 'stop_control']);

window.toggleWebcam = () =>
    toggleFeature('webcamToggleBtn', AppState.webcam, 'active', 'Webcam', ['start', 'stop'], window.stopWebcamUI);

window.updateAudioIcons = () => {
    ['output', 'input'].forEach(type => {
        document.querySelector(`.icon[data-function="audio-${type}"]`)
            ?.classList.toggle('active', AppState.audio[type]);
    });
};