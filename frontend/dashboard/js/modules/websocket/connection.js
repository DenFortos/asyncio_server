// frontend/dashboard/js/modules/websocket/connection.js

/** Управление WebSocket соединением и маршрутизация модулей **/
import { updateClient, updateClients, setClientPreview } from '../data/clients.js';
import { decodePacket } from './protocol.js';

let ws;

export const connectWebSocket = () => {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    if (!token || !login) return;

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg) return;

        const { id, module, type, payload } = pkg;
        const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Обработка системных обновлений
        if (module === 'SystemInfo' && type === 'json') {
            const updateData = Array.isArray(payload) 
                ? payload.map(c => ({ ...c, last_active: c.last_active || now }))
                : { ...payload, id, last_active: now };
            
            Array.isArray(updateData) ? updateClients(updateData) : updateClient(updateData);
        } 
        
        // Обработка превью с мгновенным обновлением DOM
        if (module === 'Preview' && type === 'bin') {
            const url = URL.createObjectURL(new Blob([payload], { type: 'image/jpeg' }));
            
            // Обновляем состояние данных
            updateClient({ id, last_active: now, status: 'online' });
            setClientPreview(id, url);

            // Прямой "пуш" в картинку, если она видна на экране
            const img = document.getElementById(`prev-${id}`);
            if (img) {
                img.src = url;
                img.style.opacity = '1';
            }
        }

        // Лог сервера
        id === 'SERVER' && console.log(`[SERVER]: ${payload}`);
    };

    ws.onclose = () => setTimeout(connectWebSocket, 5000);
    ws.onopen = () => console.log("🚀 WS Connected");
};