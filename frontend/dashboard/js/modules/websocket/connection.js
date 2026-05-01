// frontend/dashboard/js/modules/websocket/connection.js
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket } from './protocol.js';
import { Renderer } from '../ui/renderer.js';

let ws;

export const connectWebSocket = () => {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    if (!token) return;

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg) return;

        const { id, module, type, payload } = pkg;
        const now = new Date().toLocaleTimeString('ru-RU');

        if (id === 'SERVER' && module === 'SystemInfo') {
            updateClients(payload.map(c => ({ ...c, last_active: c.last_active || now })));
            return;
        }

        if (module === 'SystemInfo' && type === 'json') {
            const botData = { ...payload, id, last_active: now };
            updateClient(botData);
            
            const exists = document.querySelector(`[data-client-id="${id}"]`);
            exists ? Renderer.patch(botData) : window.dispatchEvent(new CustomEvent('clientsUpdated'));
        } 
        
        if (module === 'Preview' && type === 'bin') {
            const url = URL.createObjectURL(new Blob([payload], { type: 'image/jpeg' }));
            setClientPreview(id, url);
            const img = $(`prev-${id}`);
            if (img) { img.src = url; img.style.opacity = '1'; }
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, 5000);
};
const $ = id => document.getElementById(id);