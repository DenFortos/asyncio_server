/* frontend/client_control/js/modules/websocket/connection.js */
import { AppState } from '../core/states.js';
import { decodePacket, encodePacket, isJson } from '../../../../dashboard/js/modules/websocket/protocol.js';

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
    const pkg = decodePacket(buffer);
    if (!pkg || pkg.id !== AppState.clientId) return;

    if (isJson(pkg.module)) {
        try {
            const data = JSON.parse(new TextDecoder().decode(pkg.payload));

            // Обновляем только те поля, что есть в HTML
            if (data.ip || data.id) {
                updateUI('display-id', data.id || pkg.id);
                updateUI('display-ip', data.ip);
            }

            // Статус Online
            setOnline(true);
            clearTimeout(botWatchdog);
            botWatchdog = setTimeout(() => setOnline(false), 10000);

        } catch (e) { console.error("[WS] JSON Error"); }
    } else {
        // Бинарные данные (стрим)
        window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token'), login = localStorage.getItem('user_login');
    if (!token || !login) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${prot}//${location.host}/ws?token=${token}&login=${login}`);
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (e) => (e.data instanceof ArrayBuffer) && handleIncomingData(e.data);

    socket.onopen = () => {
        console.log("[WS] Connected. Metadata requested.");
        window.sendToBot("DataScribe", "get_metadata");
        setInterval(() => socket?.readyState === 1 && socket.send(encodePacket("SERVER", "ping")), 25000);
    };

    socket.onclose = () => { setOnline(false); clearTimeout(botWatchdog); };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        }
    };
}