// frontend/client_control/js/modules/features/input_handler.js

import { AppState } from '../core/states.js';

const canvas = document.getElementById('desktopCanvas');
const BLOCKED = new Set(['MetaLeft', 'MetaRight']);

/**
 * Расчет координат относительно размера видео внутри canvas
 * V7.2: Используем относительные координаты 0.0 - 1.0
 */
const getCoords = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    
    return (x >= 0 && x <= 1 && y >= 0 && y <= 1) ? { x, y } : null;
};

/**
 * Инициализация клавиатуры
 */
const initKeyboard = (send) => {
    const handleKey = (e, type) => {
        const el = document.activeElement;
        // Проверяем, не пишет ли пользователь в терминал или другие поля ввода
        const isTyping = ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.contentEditable === 'true';

        if (!AppState.desktop.control || isTyping) return;

        // Блокируем системные клавиши для браузера, чтобы они ушли на бот
        const isSys = e.altKey || e.ctrlKey || e.metaKey || 
                     ['Alt', 'Tab', 'Escape', 'Meta', 'Control', 'Shift', 'F1', 'F2', 'F3', 'F4', 'F5', 'F11', 'F12'].includes(e.key);
        
        if (isSys || e.currentTarget === canvas) {
            if (BLOCKED.has(e.code)) return;
            
            e.preventDefault();
            e.stopPropagation();

            // ТЗ V7.2: Интерактивные данные шлем в Stream
            // t: kd (keyDown), ku (keyUp), c: code
            send("RemoteControlStream:None", { t: type, c: e.code });
        }
    };

    window.addEventListener('keydown', e => handleKey(e, 'kd'), true);
    window.addEventListener('keyup', e => handleKey(e, 'ku'), true);
};

/**
 * Инициализация мыши
 */
const initMouse = (send) => {
    let lastMove = 0;

    canvas.addEventListener('mousemove', e => {
        // Ограничиваем частоту отправки до ~50 Гц (раз в 20мс) для экономии трафика
        if (!AppState.desktop.control || Date.now() - lastMove < 20) return;
        
        const pts = getCoords(e);
        if (pts) {
            lastMove = Date.now();
            // ТЗ V7.2: Поток координат идет в Stream
            // x, y обрезаны до 3 знаков после запятой
            send("RemoteControlStream:None", { 
                t: 'm', 
                x: +pts.x.toFixed(3), 
                y: +pts.y.toFixed(3) 
            });
        }
    });

    const handleBtn = (e, type) => {
        if (!AppState.desktop.control) return;
        if (type === 'd') canvas.focus();

        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        
        // ТЗ V7.2: Нажатия кнопок мыши в Stream
        send("RemoteControlStream:None", { t: type, b: btn });
        
        if (e.button === 2) e.preventDefault();
    };

    canvas.addEventListener('mousedown', e => handleBtn(e, 'd'));
    canvas.addEventListener('mouseup', e => handleBtn(e, 'u'));
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('wheel', e => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        // t: s (scroll), d: 1 (down/back) или -1 (up/forward)
        send("RemoteControlStream:None", { t: 's', d: e.deltaY > 0 ? 1 : -1 });
    }, { passive: false });
};

/**
 * Главная функция управления состоянием модуля
 * Вызывается из header.js или при переключении режима управления
 */
export const toggleRemoteControl = (isOn, send) => {
    AppState.desktop.control = isOn;
    
    /**
     * ТЗ V7.2: Анонс Start (1) или Stop (0)
     * Это пакет-команда в основной командный модуль RemoteControl
     * window.sendToBot превратит это в 4 байта (0x00000001 или 0x00000000)
     */
    send("RemoteControl:None", isOn ? 1 : 0);
    
    if (isOn) {
        // Скрываем локальный курсор, чтобы видеть курсор бота (если он отрисовывается в стриме)
        canvas.style.cursor = 'crosshair'; 
        canvas.focus();
        console.log("[RemoteControl] Mode: ON (Command 1 sent)");
    } else {
        canvas.style.cursor = 'default';
        console.log("[RemoteControl] Mode: OFF (Command 0 sent)");
    }
};

/**
 * Первичная инициализация при загрузке страницы
 */
export const initInputHandlers = (send) => {
    if (!canvas) return;
    
    // Позволяет canvas принимать фокус ввода, чтобы работали клавиатурные события
    canvas.tabIndex = 1; 
    canvas.style.outline = 'none'; // Убираем рамку фокуса
    
    initKeyboard(send);
    initMouse(send);
};