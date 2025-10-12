// js/modules/websocket/connection.js (ФИНАЛЬНО ИСПРАВЛЕННАЯ ВЕРСИЯ)

import { updateClient, updateClients } from '../data/clients.js';

// --- КОНСТАНТЫ И СОСТОЯНИЕ ---
const WS_URL = "ws://127.0.0.1:8001/ws";
let ws;
let reconnectInterval = 5000;
let pingIntervalId = null;
const PING_INTERVAL = 25000;
// Используем один декодер для повышения производительности
const textDecoder = new TextDecoder('utf-8');
const textEncoder = new TextEncoder(); // Для кодирования PING


// ----------------------------------------------------------------------
// ⚡️ ФУНКЦИЯ: Декодирование бинарного фрейма
// ----------------------------------------------------------------------

/**
 * Декодирует унифицированный бинарный фрейм и извлекает заголовок и полезную нагрузку.
 */
function decodeBinaryProtocol(buffer) {
    if (!buffer || buffer.byteLength < 6) {
        console.warn('Received invalid binary message: buffer too small.');
        return null;
    }

    const dataView = new DataView(buffer);
    let offset = 0;

    try {
        // 1. Чтение ID клиента
        const idLen = dataView.getUint8(offset); // 1 байт
        offset += 1;

        // ИСПРАВЛЕНО: Используем Uint8Array для надежного извлечения байтов
        const idBytes = new Uint8Array(buffer, offset, idLen);
        const client_id = textDecoder.decode(idBytes);
        offset += idLen;

        // 2. Чтение имени модуля
        const modLen = dataView.getUint8(offset); // 1 байт
        offset += 1;

        // ИСПРАВЛЕНО: Используем Uint8Array для надежного извлечения байтов
        const modBytes = new Uint8Array(buffer, offset, modLen);
        const module_name = textDecoder.decode(modBytes);
        offset += modLen;

        // 3. Чтение длины Payload (4 байта, Big Endian)
        const payloadLen = dataView.getUint32(offset, false); // false = Big Endian
        offset += 4;

        // 4. Извлечение Payload (ArrayBuffer)
        const payload = buffer.slice(offset, offset + payloadLen);

        // 5. Формирование внутреннего заголовка
        const header = {
            client_id: client_id,
            module: module_name,
            size: payloadLen
        };

        console.log(`[WS Parser] Decoded Header: ID=${client_id}, Module=${module_name}, PayloadSize=${payloadLen}`);

        return { header, payload };

    } catch (e) {
        console.error('Failed to decode binary ZMQ/WS frame:', e);
        return null;
    }
}


// ----------------------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ----------------------------------------------------------------------

/** Отправляет PING-фрейм для поддержания активности соединения. */
function sendPing() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const pingPacket = encodeToBinaryProtocol("0", "ping", new ArrayBuffer(0));
        ws.send(pingPacket);
    }
}

/** Функция кодирования (для PING) */
function encodeToBinaryProtocol(client_id, module_name, payload) {
    const id_bytes = textEncoder.encode(client_id);
    const module_bytes = textEncoder.encode(module_name);
    const payload_bytes = new Uint8Array(payload);

    let bufferSize = 1 + id_bytes.byteLength + 1 + module_bytes.byteLength + 4 + payload_bytes.byteLength;
    const buffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(buffer);

    let offset = 0;

    // 1. ID_len и ID
    dataView.setUint8(offset, id_bytes.byteLength);
    offset += 1;
    new Uint8Array(buffer, offset).set(id_bytes);
    offset += id_bytes.byteLength;

    // 2. Mod_len и Module_name
    dataView.setUint8(offset, module_bytes.byteLength);
    offset += 1;
    new Uint8Array(buffer, offset).set(module_bytes);
    offset += module_bytes.byteLength;

    // 3. Payload_len
    dataView.setUint32(offset, payload_bytes.byteLength, false);
    offset += 4;

    // 4. Payload
    new Uint8Array(buffer, offset).set(payload_bytes);

    return buffer;
}


// ----------------------------------------------------------------------
// ОСНОВНАЯ ФУНКЦИЯ ПОДКЛЮЧЕНИЯ (УБРАН ЛИШНИЙ export)
// ----------------------------------------------------------------------

function connectWebSocket() { // 🚨 Здесь больше НЕТ ключевого слова 'export'
    // Очищаем предыдущий интервал пинга, если он был
    if (pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
    }

    ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    const alertsManager = window.alertsManager;

    ws.onopen = () => {
        console.log("[WS] Connected to C2 API WebSocket.");
        pingIntervalId = setInterval(sendPing, PING_INTERVAL);
    };

    ws.onmessage = (event) => {

        if (!(event.data instanceof ArrayBuffer)) {
             console.warn("[WS] Received non-binary message (expected ArrayBuffer). Skipping.", event.data);
             return;
        }

        const decodedMessage = decodeBinaryProtocol(event.data);

        if (!decodedMessage) return;

        const header = decodedMessage.header;
        const rawPayload = decodedMessage.payload;
        const module = header.module;

        // --- A. ОБРАБОТКА PONG ---
        if (module === 'pong') {
             return;
        }

        let payload;
        let isJson = false;

        // Попытка декодировать Payload как JSON
        try {
            if (rawPayload.byteLength > 0) {
                 const payloadString = textDecoder.decode(rawPayload);

                 // ЛОГ: Показывает, что JS видит перед парсингом
                 console.log(`[WS JSON Attempt] Module: ${module}, String Length: ${payloadString.length}, Data: ${payloadString.substring(0, 100)}...`);

                 payload = JSON.parse(payloadString);
                 isJson = true;
            } else {
                 payload = null;
            }
        } catch (e) {
            console.error(`[WS JSON Error] Failed to parse JSON for module ${module}:`, e);
            payload = rawPayload;
            isJson = false;
        }

        // === 1. ОБРАБОТКА СТАРТОВОГО СПИСКА КЛИЕНТОВ (ClientList) ===
        if (module === 'ClientList' && isJson) {
            if (Array.isArray(payload)) {
                console.log(`✅ Received initial list of ${payload.length} clients.`);
                if (alertsManager) {
                   alertsManager.addLog(`[API] Received initial list of ${payload.length} clients.`);
                }
                updateClients(payload);
            }
        }
        // === 2. ОБРАБОТКА СТАТУСА/ОБНОВЛЕНИЯ (AuthUpdate) ===
        else if (module === 'AuthUpdate' && isJson) {
            const clientData = payload;
            console.log(`✅ Client Status: ${clientData.id} is ${clientData.status}`);

            if (alertsManager) {
                alertsManager.addLog(`[Client] Status update: ${clientData.id} is now ${clientData.status}.`);
            }
            updateClient(clientData);
        }
        // === 3. ОБРАБОТКА JSON-РЕЗУЛЬТАТОВ ВОБКЕРОВ ===
        else if (isJson) {
            console.log(`[${module}] JSON Data for ${header.client_id}:`, payload);
            if (alertsManager) {
                alertsManager.addLog(`[WORKER] ${module} from ${header.client_id}: ${JSON.stringify(payload).substring(0, 100)}...`);
            }
            // TODO: Диспетчеризация JSON-данных воркеров
        }
        // === 4. ОБРАБОТКА ЧИСТЫХ БИНАРНЫХ ДАННЫХ ===
        else {
            // Здесь payload является ArrayBuffer
            console.log(`[${module}] Received raw binary data for ${header.client_id}: ${rawPayload.byteLength} bytes.`);
            if (alertsManager) {
                alertsManager.addLog(`[WORKER] ${module} from ${header.client_id}: Received ${rawPayload.byteLength} bytes.`);
            }
            // TODO: Здесь должна быть логика обработки ArrayBuffer'а (например, скриншота/файла)
        }
    };

    ws.onclose = () => {
        console.warn("[WS] Disconnected. Attempting to reconnect...");
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
        setTimeout(connectWebSocket, reconnectInterval);
    };

    ws.onerror = (error) => {
        console.error("[WS] WebSocket Error:", error);
        ws.close();
    };

    window.c2WebSocket = ws;
}

// ----------------------------------------------------------------------
// ЭКСПОРТЫ (ТОЛЬКО ОДИН РАЗ В КОНЦЕ)
// ----------------------------------------------------------------------

export { connectWebSocket, decodeBinaryProtocol };