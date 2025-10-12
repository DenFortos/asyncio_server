// js/modules/websocket/parser.js

/**
 * Парсит бинарное сообщение WebSocket в формате:
 * [ID_len(1)] [ID(N)] [Mod_len(1)] [Module_name(N)] [Payload_len(4)] [Payload(N)]
 * * @param {ArrayBuffer} buffer - Бинарный буфер, полученный по WebSocket.
 * @returns {{id: string, module: string, payload: Object|Uint8Array}|null} Распарсенное сообщение.
 */
export function parseBinaryMessage(buffer) {
    if (!buffer || buffer.byteLength < 6) { // Минимальная длина (1+1+1+1+4) = 8 байт
        console.warn('Received invalid binary message: buffer too small.');
        return null;
    }

    const dataView = new DataView(buffer);
    let offset = 0;

    try {
        // --- 1. Чтение ID и ID_len ---
        const idLen = dataView.getUint8(offset); // 1 байт
        offset += 1;

        const idBytes = new Uint8Array(buffer, offset, idLen);
        const clientId = new TextDecoder().decode(idBytes);
        offset += idLen;

        // --- 2. Чтение Module_name и Mod_len ---
        const modLen = dataView.getUint8(offset); // 1 байт
        offset += 1;

        const modBytes = new Uint8Array(buffer, offset, modLen);
        const moduleName = new TextDecoder().decode(modBytes);
        offset += modLen;

        // --- 3. Чтение Payload_len (4 байта, Big Endian) ---
        const payloadLen = dataView.getUint32(offset, false); // false = Big Endian
        offset += 4;

        let payload;

        // --- 4. Чтение Payload ---
        if (payloadLen > 0) {
            const payloadBytes = new Uint8Array(buffer, offset, payloadLen);

            if (moduleName === 'AuthModule' || moduleName.endsWith('Response')) {
                // 🚨 КРИТИЧНО: Если это AuthModule или JSON-ответ, декодируем как JSON-строку
                const payloadString = new TextDecoder().decode(payloadBytes);
                payload = JSON.parse(payloadString);
            } else {
                // Иначе оставляем сырые байты (например, для скриншота или данных Fsmap)
                payload = payloadBytes;
            }
        }

        return {
            id: clientId,
            module: moduleName,
            payload: payload
        };

    } catch (e) {
        console.error('Error parsing binary WebSocket frame:', e);
        return null;
    }
}