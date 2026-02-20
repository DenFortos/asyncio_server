/* frontend/client_control/js/modules/features/input_handler.js */

import { AppState } from '../core/states.js';

const canvas = document.getElementById('desktopCanvas');

export function initInputHandlers(sendCallback) {
    if (!canvas) return;

    // Хранилище нажатых клавиш, чтобы не слать дубли при зажатии
    const pressedKeys = new Set();

    // --- 1. МЫШЬ: Движение (Throttle 50ms) ---
    let lastMove = 0;
    canvas.addEventListener('mousemove', (e) => {
        if (!AppState.desktop.control) return;

        const now = Date.now();
        if (now - lastMove < 30) return; // Уменьшил до 30мс для большей плавности
        lastMove = now;

        const coords = getRelativeCoords(e);
        sendCallback("InputForge", `m:${coords.x.toFixed(4)}:${coords.y.toFixed(4)}`);
    });

    // --- 2. МЫШЬ: Кнопки ---
    canvas.addEventListener('mousedown', (e) => {
        if (!AppState.desktop.control) return;
        // Перехватываем фокус на канвас при клике, чтобы работала клавиатура
        canvas.focus();

        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        sendCallback("InputForge", `d:${btn}`);
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!AppState.desktop.control) return;
        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        sendCallback("InputForge", `u:${btn}`);
    });

    // --- 3. МЫШЬ: Скролл ---
    canvas.addEventListener('wheel', (e) => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        const direction = e.deltaY > 0 ? 'down' : 'up';
        sendCallback("InputForge", `s:${direction}`);
    }, { passive: false });

    // --- 4. КЛАВИАТУРА (С фильтрацией повторов) ---
    window.addEventListener('keydown', (e) => {
        if (!AppState.desktop.control) return;

        // Если клавиша уже зажата, браузер будет слать повторы. Игнорируем их.
        if (pressedKeys.has(e.key)) return;
        pressedKeys.add(e.key);

        if (shouldPreventDefault(e)) e.preventDefault();
        sendCallback("InputForge", `kd:${e.key}`);
    });

    window.addEventListener('keyup', (e) => {
        if (!AppState.desktop.control) return;

        pressedKeys.delete(e.key);
        sendCallback("InputForge", `ku:${e.key}`);
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function getRelativeCoords(event) {
    const rect = canvas.getBoundingClientRect();
    // Ограничиваем координаты строго в пределах 0-1
    let x = (event.clientX - rect.left) / rect.width;
    let y = (event.clientY - rect.top) / rect.height;

    return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y))
    };
}

function shouldPreventDefault(e) {
    const keys = ['Tab', 'Alt', 'F5', 'F11', 'Control', 'Shift', 'Escape'];
    return keys.includes(e.key) || (e.ctrlKey && ['r', 'f', 'p'].includes(e.key.toLowerCase()));
}