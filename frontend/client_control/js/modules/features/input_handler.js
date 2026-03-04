// frontend/client_control/js/modules/features/input_handler.js

import { AppState } from '../core/states.js';

const canvas = document.getElementById('desktopCanvas');
const video = document.getElementById('desktopVideo');

/* ==========================================================================
   1. ЧЁРНЫЙ СПИСОК КЛАВИШ
========================================================================== */
const BLOCKED_KEYS = new Set(['MetaLeft', 'MetaRight']);

/* ==========================================================================
   2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
========================================================================== */
const focusCanvas = () => {
    if (AppState.desktop.control && canvas) {
        canvas.focus();
        canvas.tabIndex = 1;
    }
};

const isBlocked = (code) => BLOCKED_KEYS.has(code);

/* ==========================================================================
   3. КЛАВИАТУРА (ОДИН ПАКЕТ НА КЛАВИШУ)
========================================================================== */
function initKeyboard(sendCallback) {
    const systemKeys = ['Alt', 'Tab', 'Escape', 'Meta', 'Control', 'Shift'];

    // Системные комбинации
    window.addEventListener('keydown', (e) => {
        if (!AppState.desktop.control) return;
        if (e.altKey || e.ctrlKey || e.metaKey ||
            systemKeys.includes(e.key) || (e.shiftKey && e.altKey)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (!isBlocked(e.code)) sendCallback("InputForge", `kd:${e.code}`);
            return false;
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        if (!AppState.desktop.control) return;
        if (e.altKey || e.ctrlKey || e.metaKey || systemKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (!isBlocked(e.code)) sendCallback("InputForge", `ku:${e.code}`);
            return false;
        }
    }, true);

    // ← Обычные клавиши: ОДИН ПАКЕТ (down+up вместе)
    canvas.addEventListener('keydown', (e) => {
        if (!AppState.desktop.control) return;
        if (isBlocked(e.code)) { e.preventDefault(); return; }
        e.preventDefault();
        e.stopPropagation();

        // ← Отправляем полное нажатие одним пакетом!
        sendCallback("InputForge", `k:${e.code}`);
    });
}

/* ==========================================================================
   4. МЫШЬ
========================================================================== */
function initMouse(sendCallback) {
    let lastMove = 0;

    canvas.addEventListener('mousemove', (e) => {
        if (!AppState.desktop.control) return;
        const now = Date.now();
        if (now - lastMove < 8) return;
        lastMove = now;
        const coords = getCorrectedCoords(e);
        if (coords) sendCallback("InputForge", `m:${coords.x.toFixed(4)}:${coords.y.toFixed(4)}`);
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!AppState.desktop.control) return;
        focusCanvas();
        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        sendCallback("InputForge", `d:${btn}`);
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!AppState.desktop.control) return;
        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        sendCallback("InputForge", `u:${btn}`);
    });

    canvas.addEventListener('wheel', (e) => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        e.stopPropagation();
        sendCallback("InputForge", `s:${e.deltaY > 0 ? 'down' : 'up'}`);
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        e.stopPropagation();
    });
}

/* ==========================================================================
   5. ТОЧКА ВХОДА
========================================================================== */
export function initInputHandlers(sendCallback) {
    if (!canvas || !video) return;
    initKeyboard(sendCallback);
    initMouse(sendCallback);
}

/* ==========================================================================
   6. УТИЛИТЫ
========================================================================== */
function getCorrectedCoords(event) {
    const rect = canvas.getBoundingClientRect();
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    if (!vW || !vH) return null;

    const canvasRatio = rect.width / rect.height;
    const videoRatio = vW / vH;
    let actualW, actualH, offX = 0, offY = 0;

    if (canvasRatio > videoRatio) {
        actualH = rect.height;
        actualW = actualH * videoRatio;
        offX = (rect.width - actualW) / 2;
    } else {
        actualW = rect.width;
        actualH = actualW / videoRatio;
        offY = (rect.height - actualH) / 2;
    }

    const x = (event.clientX - rect.left - offX) / actualW;
    const y = (event.clientY - rect.top - offY) / actualH;
    return (x >= 0 && x <= 1 && y >= 0 && y <= 1) ? { x, y } : null;
}