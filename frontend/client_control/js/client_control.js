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

    /* ==========================================================================
       4. ЛОГИКА БЕЗОПАСНОГО ЗАВЕРШЕНИЯ (Safe Exit)
    ========================================================================== */

    /**
     * Обработка закрытия или перезагрузки страницы (F5 / Close Tab)
     */
    window.addEventListener('beforeunload', () => {
        // Проверяем, жив ли сокет и доступен ли метод отправки
        if (window.sendToBot && AppState.clientId) {
            console.log("[Control] Page unload detected. Stopping all streams...");

            // Отправляем форсированный сигнал остановки
            // Бот при получении session_stop должен немедленно убить все
            // активные процессы (скриншоты, аудио, видео)
            window.sendToBot("Heartbeat", "session_stop");
        }
    });

    console.log(`[Control] Dashboard initialized for Client: ${AppState.clientId}`);
});