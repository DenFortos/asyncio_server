// frontend\client_control\js\client_control.js
import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js';
import { initFullscreen } from './modules/ui/fullscreen.js';
import { initControlConnection } from './modules/websocket/connection.js';
import { initInputHandlers } from './modules/features/input_handler.js';
import { initTerminal } from './modules/features/terminal.js';
import { initFileManager } from './modules/features/files.js';

document.addEventListener('DOMContentLoaded', () => {
    AppState.reset();
    window.AppState = AppState;

    initSidebar();
    initHeaderControls();
    initFullscreen();
    initTerminal();
    initFileManager();
    initControlConnection();

    initInputHandlers((mod, pay) => window.sendToBot?.(mod, pay));

    window.addEventListener('beforeunload', () => {
        const { clientId } = AppState;
        window.sendToBot && clientId && window.sendToBot("Heartbeat", "session_stop");
    });
});