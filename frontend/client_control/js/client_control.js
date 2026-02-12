/* frontend/client_control/js/client_control.js */

import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js'; // Создадим его сейчас
import { initControlConnection } from './modules/websocket/connection.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Сброс состояния (уже включает визуальный сброс)
    AppState.reset();

    // 2. Инициализация UI
    initSidebar();        // Переключает вкладки и сворачивает боковое меню
    initHeaderControls(); // Привязывает клики к кнопкам в шапке (Start Stream и т.д.)

    // 3. Сеть
    initControlConnection(); // Подключает сокет
});