import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js';
import { initFullscreen } from './modules/ui/fullscreen.js';
import { initControlConnection } from './modules/websocket/connection.js';
import { initInputHandlers } from './modules/features/input_handler.js';
import { initTerminal } from './modules/features/terminal.js'; // Добавлено

document.addEventListener('DOMContentLoaded', () => {
    AppState.reset();
    window.AppState = AppState;

    initSidebar();
    initHeaderControls();
    initFullscreen();
    initTerminal(); // Инициализация терминала

    initControlConnection();

    initInputHandlers((mod, pay) => {
        if (window.sendToBot) window.sendToBot(mod, pay);
    });

    window.addEventListener('beforeunload', () => {
        if (window.sendToBot && AppState.clientId) {
            window.sendToBot("Heartbeat", "session_stop");
        }
    });
});