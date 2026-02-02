import { updateClient, updateClients } from '../data/clients.js';

let ws, pingIntervalId;
const PING_INTERVAL = 25000;
const RECONNECT_DELAY = 5000;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** * Хелперы для работы с бинарным протоколом
 */
const readStr = (view, offset) => {
    const len = view.getUint8(offset);
    const str = decoder.decode(new Uint8Array(view.buffer, offset + 1, len));
    return { str, next: offset + 1 + len };
};

/**
 * Декодирует пакет: [ID_L][ID][Mod_L][Mod][Pay_L][Payload]
 */
function decodeBinary(buffer) {
    if (!buffer || buffer.byteLength < 6) return null;
    const view = new DataView(buffer);

    try {
        const idObj = readStr(view, 0);
        const modObj = readStr(view, idObj.next);
        const pLen = view.getUint32(modObj.next, false); // big-endian

        const payloadBuffer = buffer.slice(modObj.next + 4, modObj.next + 4 + pLen);

        return {
            id: idObj.str,
            module: modObj.str,
            payload: payloadBuffer
        };
    } catch (e) {
        console.error("[Parser Error]", e);
        return null;
    }
}

/**
 * Кодирует пакет для отправки на сервер
 */
function encodeBinary(id, mod, payloadArray = []) {
    const bId = encoder.encode(id);
    const bMod = encoder.encode(mod);
    const bPay = new Uint8Array(payloadArray);

    const buf = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    let off = 0;

    buf[off++] = bId.length;
    buf.set(bId, off);
    off += bId.length;

    buf[off++] = bMod.length;
    buf.set(bMod, off);
    off += bMod.length;

    new DataView(buf.buffer).setUint32(off, bPay.length, false);
    off += 4;

    buf.set(bPay, off);
    return buf.buffer;
}

const getWsUrl = () => {
    const login = localStorage.getItem('user_login') || 'admin';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws?login=${encodeURIComponent(login)}`;
};

export function connectWebSocket() {
    const url = getWsUrl();
    if (!url) return;

    if (pingIntervalId) clearInterval(pingIntervalId);

    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log("%c[WS] Connected to C2 Server", "color: #00ff00; font-weight: bold;");
        // Пинг-понг для поддержания соединения
        pingIntervalId = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(encodeBinary("0", "ping", []));
            }
        }, PING_INTERVAL);
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodeBinary(data);
        if (!pkg || pkg.module === 'pong') return;

        const { id, module, payload } = pkg;

        // Модули, которые гарантированно шлют JSON
        const jsonModules = ['ClientList', 'DataScribe', 'AuthUpdate', 'AuthModule'];
        const isJson = jsonModules.includes(module) || module.endsWith('Response');

        try {
            if (isJson) {
                const rawString = decoder.decode(payload);
                const dataObj = JSON.parse(rawString);

                if (module === 'ClientList') {
                    updateClients(dataObj);
                } else {
                    // КЛЕЙ: берем ID из бинарного заголовка, если в JSON его нет (для Heartbeat)
                    const clientUpdate = {
                        ...dataObj,
                        id: dataObj.id || id
                    };
                    updateClient(clientUpdate);

                    // Логируем активность в Alerts, если есть менеджер
                    if (window.alertsManager) {
                        window.alertsManager.addLog(`[${module}] ${id}: ${clientUpdate.status || 'active'}`);
                    }
                }
            } else {
                // Если данные не JSON, пробрасываем как событие для специфических модулей (Screen, Audio и т.д.)
                window.dispatchEvent(new CustomEvent('binaryDataReceived', {
                    detail: { id, module, payload }
                }));
            }
        } catch (e) {
            console.warn(`[WS] Failed to process message from module: ${module}`, e);
        }
    };

    ws.onclose = (e) => {
        console.log("[WS] Connection closed. Reconnecting...");
        if (pingIntervalId) clearInterval(pingIntervalId);
        setTimeout(connectWebSocket, RECONNECT_DELAY);
    };

    ws.onerror = (err) => {
        console.error("[WS] WebSocket Error:", err);
        ws.close();
    };

    // Глобальный доступ для отправки команд из других модулей
    window.c2WebSocket = {
        send: (id, mod, pay) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(encodeBinary(id, mod, pay));
            }
        }
    };
}