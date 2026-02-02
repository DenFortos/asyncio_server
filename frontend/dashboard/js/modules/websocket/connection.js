import { updateClient, updateClients } from '../data/clients.js';
import { decodePacket, encodePacket, isJson } from './protocol.js';

let ws, pingId;

export function connectWebSocket() {
    const login = encodeURIComponent(localStorage.getItem('user_login') || 'admin');
    const url = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${login}`;

    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        clearInterval(pingId);
        pingId = setInterval(() => ws.readyState === 1 && ws.send(encodePacket("0", "ping")), 25000);
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        if (isJson(pkg.module)) {
            const dataObj = JSON.parse(new TextDecoder().decode(pkg.payload));
            if (pkg.module === 'ClientList') return updateClients(dataObj);

            const update = { ...dataObj, id: dataObj.id || pkg.id };
            updateClient(update);
            window.alertsManager?.addLog(`[${pkg.module}] ${pkg.id}: ${update.status || 'active'}`);
        } else {
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, 5000);
    window.c2WebSocket = { send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay)) };
}