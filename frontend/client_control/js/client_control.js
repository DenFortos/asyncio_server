/* frontend/client_control/js/client_control.js */

/* ==========================================================================
   ТОЧКА ВХОДА (Main Entry Point)
   ========================================================================== */

import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js';
import { initControlConnection } from './modules/websocket/connection.js';

/**
 * Инициализация контрольной панели
 * Запускается строго после загрузки DOM
 */
document.addEventListener('DOMContentLoaded', () => {

    /* 1. ПОДГОТОВКА (Initialization) */
    // Сбрасываем старые состояния и очищаем UI перед новой сессией
    AppState.reset();

    /* 2. ИНТЕРФЕЙС (User Interface) */
    // Включаем логику бокового меню (навигация Desktop/Webcam)
    initSidebar();

    // Активируем кнопки управления в шапке (Stream, Control, Mic)
    initHeaderControls();

    /* 3. СЕТЕВОЙ СЛОЙ (Networking) */
    // Устанавливаем WebSocket соединение и запускаем Watchdog
    initControlConnection();

    console.log(`[Control] Dashboard initialized for Client: ${AppState.clientId}`);
});