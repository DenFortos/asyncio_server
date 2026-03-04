/* frontend/client_control/js/modules/features/input_handler.js */

import { AppState } from '../core/states.js';

const canvas = document.getElementById('desktopCanvas');
const video = document.getElementById('desktopVideo');

export function initInputHandlers(sendCallback) {
    if (!canvas || !video) return;
    const pressedKeys = new Set();

    // Движение мыши (Throttle 8ms вместо 30ms)
    let lastMove = 0;
    canvas.addEventListener('mousemove', (e) => {
        if (!AppState.desktop.control) return;
        const now = Date.now();
        if (now - lastMove < 8) return;  // ← 8ms = ~125 событий/сек
        lastMove = now;

        const coords = getCorrectedCoords(e);
        if (coords) sendCallback("InputForge", `m:${coords.x.toFixed(4)}:${coords.y.toFixed(4)}`);
    });

    // Mouse buttons
    canvas.addEventListener('mousedown', (e) => {
        if (!AppState.desktop.control) return;
        canvas.focus();
        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        sendCallback("InputForge", `d:${btn}`);
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!AppState.desktop.control) return;
        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        sendCallback("InputForge", `u:${btn}`);
    });

    // Scroll
    canvas.addEventListener('wheel', (e) => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        sendCallback("InputForge", `s:${e.deltaY > 0 ? 'down' : 'up'}`);
    }, { passive: false });

    // Keyboard
    window.addEventListener('keydown', (e) => {
        if (!AppState.desktop.control || pressedKeys.has(e.key)) return;
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

function shouldPreventDefault(e) {
    const keys = ['Tab', 'Alt', 'F5', 'F11', 'Control', 'Shift', 'Escape'];
    return keys.includes(e.key) || (e.ctrlKey && ['r', 'f', 'p'].includes(e.key.toLowerCase()));
}