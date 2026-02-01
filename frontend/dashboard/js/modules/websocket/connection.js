// js/modules/websocket/connection.js

import { updateClient, updateClients } from '../data/clients.js';

// --- КОНСТАНТЫ И СОСТОЯНИЕ ---
const WS_URL = "ws://127.0.0.1:8001/ws";
let ws;
let reconnectInterval = 5000;
let pingIntervalId = null;
const PING_INTERVAL = 25000;
const textDecoder = new TextDecoder('utf-8');
const textEncoder = new TextEncoder();

/**
 * Декодирует бинарный пакет согласно протоколу:
 * [ID_len(1)][ID][Mod_len(1)][Mod][Payload_len(4)][Payload]
 */
function decodeBinaryProtocol(buffer) {
    if (!buffer || buffer.byteLength < 6) {
        console.warn('[WS Parser] Пакет слишком мал для заголовка');
        return null;
    }

    const dataView = new DataView(buffer);
    let offset = 0;

    try {
        // 1. Чтение ID
        const idLen = dataView.getUint8(offset);
        offset += 1;
        const idBytes = new Uint8Array(buffer, offset, idLen);
        const client_id = textDecoder.decode(idBytes);
        offset += idLen;

        // 2. Чтение Модуля
        const modLen = dataView.getUint8(offset);
        offset += 1;
        const modBytes = new Uint8Array(buffer, offset, modLen);
        const module_name = textDecoder.decode(modBytes);
        offset += modLen;

        // 3. Чтение длины Payload (4 байта, Big Endian)
        const payloadLen = dataView.getUint32(offset, false);
        offset += 4;

        // 4. Извлечение Payload
        const payload = buffer.slice(offset, offset + payloadLen);

        return {
            header: { client_id, module: module_name, size: payloadLen },
            payload: payload
        };
    } catch (e) {
        console.error('[WS Parser] Ошибка разбора бинарного фрейма:', e);
        return null;
    }
}

/** Кодирование для PING */
function encodeToBinaryProtocol(client_id, module_name, payload) {
    const id_bytes = textEncoder.encode(client_id);
    const module_bytes = textEncoder.encode(module_name);
    const payload_bytes = new Uint8Array(payload);

    let bufferSize = 1 + id_bytes.byteLength + 1 + module_bytes.byteLength + 4 + payload_bytes.byteLength;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    let offset = 0;
    dataView.setUint8(offset, id_bytes.byteLength); offset += 1;
    new Uint8Array(buffer, offset).set(id_bytes); offset += id_bytes.byteLength;
    dataView.setUint8(offset, module_bytes.byteLength); offset += 1;
    new Uint8Array(buffer, offset).set(module_bytes); offset += module_bytes.byteLength;
    dataView.setUint32(offset, payload_bytes.byteLength, false); offset += 4;
    new Uint8Array(buffer, offset).set(payload_bytes);

    return buffer;
}

function sendPing() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(encodeToBinaryProtocol("0", "ping", new ArrayBuffer(0)));
    }
}

export function connectWebSocket() {
    if (pingIntervalId) clearInterval(pingIntervalId);

    ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    const alertsManager = window.alertsManager;

    ws.onopen = () => {
        console.log("%c[WS] Соединение установлено", "color: #00ff00; font-weight: bold;");
        pingIntervalId = setInterval(sendPing, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer)) return;

        const decoded = decodeBinaryProtocol(event.data);
        if (!decoded) return;

        const { header, payload: rawPayload } = decoded;
        const module = header.module;

        if (module === 'pong') return;

        // Список JSON-модулей, которые требуют парсинга
        const jsonModules = ['ClientList', 'DataScribe', 'AuthUpdate'];
        let payloadData = null;
        let isJson = false;

        if (jsonModules.includes(module) && rawPayload.byteLength > 0) {
            try {
                payloadData = JSON.parse(textDecoder.decode(rawPayload));
                isJson = true;
            } catch (e) {
                console.error(`[WS] Ошибка JSON в модуле ${module}:`, e);
            }
        }

        // --- ДИСПЕТЧЕРИЗАЦИЯ ---

        if (module === 'ClientList' && isJson) {
            updateClients(payloadData);
        }
        else if ((module === 'DataScribe' || module === 'AuthUpdate') && isJson) {
            // ВАЖНО: Мы передаем данные в clients.js, который кинет событие для dashboard.js
            updateClient(payloadData);

            if (alertsManager) {
                const win = payloadData.activeWindow || 'N/A';
                alertsManager.addLog(`[${module}] ${header.client_id} -> ${win}`);
            }
        }
        else if (!isJson) {
            // Для бинарных данных (скриншоты и т.д.)
            window.dispatchEvent(new CustomEvent('binaryDataReceived', {
                detail: { header, payload: rawPayload }
            }));
        }
    };

    ws.onclose = () => {
        console.warn("[WS] Соединение потеряно. Реконнект...");
        if (pingIntervalId) clearInterval(pingIntervalId);
        setTimeout(connectWebSocket, reconnectInterval);
    };

    ws.onerror = (err) => {
        console.error("[WS] Ошибка сокета:", err);
    };

    window.c2WebSocket = ws;
}