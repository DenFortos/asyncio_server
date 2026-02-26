/* frontend/client_control/js/client_control.js */

/* ==========================================================================
   1. ИМПОРТ МОДУЛЕЙ
   ========================================================================== */
import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js';
import { initFullscreen } from './modules/ui/fullscreen.js'; // Добавлен Fullscreen
import { initControlConnection } from './modules/websocket/connection.js';
import { initInputHandlers } from './modules/features/input_handler.js';

/* ==========================================================================
   2. ТОЧКА ВХОДА (DOMContentLoaded)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {

    /* --- ПОДГОТОВКА --- */
    AppState.reset();

    /* --- ИНТЕРФЕЙС --- */
    initSidebar();
    initHeaderControls();
    initFullscreen(); // Инициализация фуллскрина

    /* --- СЕТЕВОЙ СЛОЙ --- */
    initControlConnection();

    /* --- УПРАВЛЕНИЕ (InputForge) --- */
    initInputHandlers((mod, pay) => {
        if (window.sendToBot) window.sendToBot(mod, pay);
    });

    /* ==========================================================================
       3. БЕЗОПАСНОСТЬ (Safe Exit)
       ========================================================================== */
    window.addEventListener('beforeunload', () => {
        if (window.sendToBot && AppState.clientId) {
            window.sendToBot("Heartbeat", "session_stop");
        }
    });

    console.log(`[Control] Dashboard ready | Client: ${AppState.clientId}`);
});