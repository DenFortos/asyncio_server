/* frontend/client_control/js/client_control.js */

/* ==========================================================================
   1. ИМПОРТ МОДУЛЕЙ
   ========================================================================== */
import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js';
import { initControlConnection } from './modules/websocket/connection.js';
import { initInputHandlers } from './modules/features/input_handler.js'; // Добавлен InputForge

/* ==========================================================================
   2. ТОЧКА ВХОДА (DOMContentLoaded)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {

    /* --- ПОДГОТОВКА --- */
    AppState.reset();

    /* --- ИНТЕРФЕЙС --- */
    initSidebar();
    initHeaderControls();

    /* --- СЕТЕВОЙ СЛОЙ --- */
    initControlConnection();

    /* --- УПРАВЛЕНИЕ (InputForge) --- */
    // Передаем глобальную функцию отправки пакетов в обработчик ввода
    initInputHandlers((mod, pay) => {
        if (window.sendToBot) window.sendToBot(mod, pay);
    });

    /* ==========================================================================
       3. БЕЗОПАСНОСТЬ (Safe Exit)
       ========================================================================== */
    window.addEventListener('beforeunload', () => {
        if (window.sendToBot && AppState.clientId) {
            console.log("[Control] Stop signal sent via Heartbeat");
            window.sendToBot("Heartbeat", "session_stop");
        }
    });

    console.log(`[Control] Dashboard ready | Client: ${AppState.clientId}`);
});