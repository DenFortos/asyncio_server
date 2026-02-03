// js/modules/websocket/connection.js

import { updateClient, updateClients } from '../data/clients.js';
import { decodePacket, encodePacket, isJson } from './protocol.js';

let ws;

export function connectWebSocket() {
    const login = encodeURIComponent(localStorage.getItem('user_login') || 'admin');
    const url = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${login}`;

    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log("[WS] Connected");
        // Пинг серверу раз в 25 сек
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("0", "ping")), 25000);
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        if (isJson(pkg.module)) {
            try {
                const rawData = JSON.parse(new TextDecoder().decode(pkg.payload));

                if (pkg.module === 'ClientList' && Array.isArray(rawData)) {
                    updateClients(rawData);
                } else {
                    const update = { ...rawData, id: rawData.id || pkg.id };

                    // Ключевое отличие: проверяем маркер "net"
                    const isHeartbeat = update.net === 'heartbeat';

                    updateClient(update, isHeartbeat);
                }
            } catch (e) { console.error("[WS] JSON Error", e); }
        } else {
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, 5000);

    window.c2WebSocket = {
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay))
    };
}