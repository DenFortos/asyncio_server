/* frontend/dashboard/js/modules/websocket/connection.js */

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКА (Init & Setup)
========================================================================== */

import { updateClient, updateClients } from '../data/clients.js';
import { decodePacket, encodePacket } from './protocol.js';

let ws;
const decoder = new TextDecoder();

export function connectWebSocket() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');

    if (!token || !login) return window.location.href = '/sidebar/auth/auth.html';

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${prot}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';

    /* ==========================================================================
       2. ОБРАБОТКА СОБЫТИЙ (Event Handlers)
    ========================================================================== */

    ws.onopen = () => {
        console.log("[WS] Connected");
        // Пинг сервера для поддержания сессии
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("", "Heartbeat", "ping")), 25000);
    };

    ws.onmessage = ({ data }) => {
        if (!(data instanceof ArrayBuffer)) return;

        const pkg = decodePacket(data);
        if (!pkg || pkg.module === 'pong') return;

        // Системные команды безопасности
        if (pkg.module === 'AuthUpdate') {
            localStorage.removeItem('auth_token');
            return window.location.reload();
        }

        // Парсинг данных и обновление состояния ботов
        try {
            const rawData = JSON.parse(decoder.decode(pkg.payload));

            if (pkg.module === 'DataScribe' || pkg.module === 'Heartbeat') {
                const isLive = !rawData.auth_key || pkg.module === 'Heartbeat';
                updateClient({ ...rawData, id: rawData.id || pkg.id }, isLive);
            }
            else if (Array.isArray(rawData)) {
                updateClients(rawData);
            }
        } catch (e) {
            // Передача бинарных данных (стрим, вебка) в систему событий
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
        }
    };

    /* ==========================================================================
       3. ЖИЗНЕННЫЙ ЦИКЛ И API (Lifecycle & Public API)
    ========================================================================== */

    ws.onclose = (e) => {
        console.log("[WS] Closed:", e.code);
        if (e.code === 1008) {
            localStorage.clear();
            window.location.href = '/sidebar/auth/auth.html';
        } else if (e.code !== 1000 && e.code !== 1001) {
            // Авто-реконнект при обрыве
            setTimeout(connectWebSocket, 5000);
        }
    };

    // Глобальный интерфейс отправки для других модулей
    window.c2WebSocket = {
        send: (id, mod, pay) => ws?.readyState === 1 && ws.send(encodePacket(id, mod, pay))
    };
}