// frontend/dashboard/js/modules/websocket/connection.js
import { updateClient, updateClients } from '../data/clients.js';
import { decodePacket, encodePacket, isJson } from './protocol.js';

let ws;

export function connectWebSocket() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');

    if (!token || !login) return window.location.href = '/sidebar/auth/auth.html';

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${prot}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log("[WS] Connected");
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("0", "ping")), 25000);
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        if (pkg.module === 'AuthUpdate') {
            localStorage.removeItem('auth_token');
            return window.location.reload();
        }

        if (isJson(pkg.module)) {
            try {
                const rawData = JSON.parse(new TextDecoder().decode(pkg.payload));
                if (pkg.module === 'ClientList') {
                    updateClients(rawData);
                } else {
                    updateClient({ ...rawData, id: rawData.id || pkg.id }, rawData.net === 'heartbeat');
                }
            } catch (e) { console.error("[WS] JSON Error:", e); }
        } else {
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
        }
    };

    ws.onclose = (e) => {
        if (e.code === 1008) {
            localStorage.clear();
            window.location.href = '/sidebar/auth/auth.html';
        } else {
            setTimeout(connectWebSocket, 5000);
        }
    };

    window.c2WebSocket = {
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay))
    };
}