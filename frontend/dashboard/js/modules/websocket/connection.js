// frontend/dashboard/js/modules/websocket/connection.js
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket } from './protocol.js';

let ws;

export const connectWebSocket = () => {
    const t = localStorage.getItem('auth_token'), l = localStorage.getItem('user_login');
    if (!t || !l) return;

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${encodeURIComponent(l)}&token=${t}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg) return;
        const { id, module, payload } = pkg;

        if (module.startsWith('SystemInfo')) {
            Array.isArray(payload) ? updateClients(payload) : updateClient({ ...payload, id });
        } 
        else if (module.startsWith('Preview')) {
            // Теперь payload - это чистый ArrayBuffer из protocol.js
            const blob = new Blob([payload], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            
            console.log(`[UI] New Preview for ${id} (${payload.byteLength} bytes)`);
            setClientPreview(id, url);
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, 5000);
    ws.onopen = () => console.log("🚀 WS Connected");
};