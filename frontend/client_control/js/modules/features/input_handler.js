// frontend/client_control/js/modules/features/input_handler.js
import { AppState } from '../core/states.js';

const canvas = document.getElementById('desktopCanvas');
const video = document.getElementById('desktopVideo');
const BLOCKED = new Set(['MetaLeft', 'MetaRight']);

const focus = () => AppState.desktop.control && canvas?.focus();

function initKeyboard(send) {
    const handleKey = (e, type) => {
        if (!AppState.desktop.control || document.activeElement.id === 'terminal-cmd') return;
        const isSys = e.altKey || e.ctrlKey || e.metaKey || ['Alt', 'Tab', 'Escape', 'Meta', 'Control', 'Shift'].includes(e.key);
        
        if (isSys || e.currentTarget === canvas) {
            if (BLOCKED.has(e.code)) return;
            e.preventDefault();
            e.stopPropagation();
            send("InputForge", `${type}:${e.code}`);
        }
    };

    window.addEventListener('keydown', e => handleKey(e, 'kd'), true);
    window.addEventListener('keyup', e => handleKey(e, 'ku'), true);
    canvas.addEventListener('keydown', e => handleKey(e, 'k'));
}

function initMouse(send) {
    let lastMove = 0;

    canvas.addEventListener('mousemove', e => {
        if (!AppState.desktop.control || Date.now() - lastMove < 10) return;
        lastMove = Date.now();
        const pts = getCoords(e);
        pts && send("InputForge", `m:${pts.x.toFixed(4)}:${pts.y.toFixed(4)}`);
    });

    const handleBtn = (e, type) => {
        if (!AppState.desktop.control) return;
        type === 'd' && focus();
        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        send("InputForge", `${type}:${btn}`);
        e.button === 2 && e.preventDefault();
    };

    canvas.addEventListener('mousedown', e => handleBtn(e, 'd'));
    canvas.addEventListener('mouseup', e => handleBtn(e, 'u'));
    canvas.addEventListener('wheel', e => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        send("InputForge", `s:${e.deltaY > 0 ? 'down' : 'up'}`);
    }, { passive: false });
}

export function initInputHandlers(send) {
    if (!canvas || !video) return;
    canvas.tabIndex = 1;
    initKeyboard(send);
    initMouse(send);
}

function getCoords(e) {
    const r = canvas.getBoundingClientRect();
    const vW = video.videoWidth, vH = video.videoHeight;
    if (!vW || !vH) return null;

    const vR = vW / vH, cR = r.width / r.height;
    let aW = r.width, aH = r.height, oX = 0, oY = 0;

    if (cR > vR) {
        aW = aH * vR;
        oX = (r.width - aW) / 2;
    } else {
        aH = aW / vR;
        oY = (r.height - aH) / 2;
    }

    const x = (e.clientX - r.left - oX) / aW;
    const y = (e.clientY - r.top - oY) / aH;
    return (x >= 0 && x <= 1 && y >= 0 && y <= 1) ? { x, y } : null;
}