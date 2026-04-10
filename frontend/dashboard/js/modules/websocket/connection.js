/* frontend/dashboard/js/modules/websocket/connection.js */
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket, encodePacket } from './protocol.js';

let ws;
const decoder = new TextDecoder();

export function connectWebSocket() {
    const auth = { t: localStorage.getItem('auth_token'), l: localStorage.getItem('user_login') };
    if (!auth.t || !auth.l) return;

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${encodeURIComponent(auth.l)}&token=${auth.t}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg) return;

        if (pkg.module === 'DataScribe') {
            try {
                const raw = JSON.parse(decoder.decode(pkg.payload));
                Array.isArray(raw) ? updateClients(raw) : updateClient({ ...raw, id: pkg.id });
            } catch (e) { console.error("JSON Error", e); }
        } 
        else if (pkg.module === 'Preview') {
            const url = URL.createObjectURL(new Blob([pkg.payload], { type: 'image/jpeg' }));
            setClientPreview(pkg.id, url);
            const img = document.getElementById(`prev-${pkg.id}`);
            if (img) { img.src = url; img.style.opacity = "1"; }
        }
    };

    const reconnect = () => { if(ws) ws.onclose = ws.onerror = null; setTimeout(connectWebSocket, 5000); };
    ws.onclose = ws.onerror = reconnect;
    ws.onopen = () => console.log("🚀 WS Connected");

    window.c2WebSocket = { 
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay)) 
    };
}