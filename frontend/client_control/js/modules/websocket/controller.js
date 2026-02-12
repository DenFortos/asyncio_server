import { toggleFeature } from '../ui/controller.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Инициализация интерфейса
    if (window.initClientUI) window.initClientUI();

    // 2. Групповая привязка кнопок управления
    const actions = [
        {
            id: 'btn-desktop-stream',
            ref: AppState.desktop,
            key: 'observe',
            mod: 'ScreenWatch',
            cmds: ['start_stream', 'stop_stream']
        },
        {
            id: 'btn-desktop-control',
            ref: AppState.desktop,
            key: 'control',
            mod: 'InputForge',
            cmds: ['start_control', 'stop_control']
        },
        {
            id: 'btn-webcam-stream',
            ref: AppState.webcam,
            key: 'active',
            mod: 'CamGaze',
            cmds: ['start', 'stop']
        }
    ];

    // Инициализируем слушатели в цикле для чистоты кода
    actions.forEach(({ id, ref, key, mod, cmds }) => {
        document.getElementById(id)?.addEventListener('click', () =>
            toggleFeature(id, ref, key, mod, cmds)
        );
    });

    // 3. Логика переключения режимов сайдбара
    document.querySelectorAll('.nav-item[data-function]').forEach(item => {
        item.addEventListener('click', () => {
            const mode = item.dataset.function;

            // Визуальное переключение активной иконки
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Вызов глобальной функции переключения вида (если есть)
            if (window.switchView) window.switchView(mode);
        });
    });
});