/* frontend/client_control/js/modules/websocket/sender.js */
import { AppState } from '../core/states.js';

/**
 * Упаковывает данные в бинарный пакет: [ID_len(1)][ID][Mod_len(1)][Mod][Pay_len(4)][Payload]
 */
export function encodePacket(clientId, moduleName, payload) {
    const encoder = new TextEncoder();
    const idBuf = encoder.encode(clientId || "unknown");
    const modBuf = encoder.encode(moduleName);
    const payBuf = encoder.encode(payload);

    const totalSize = 1 + idBuf.length + 1 + modBuf.length + 4 + payBuf.length;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    let offset = 0;

    // 1. Client ID
    view.setUint8(offset, idBuf.length);
    offset += 1;
    new Uint8Array(buffer, offset, idBuf.length).set(idBuf);
    offset += idBuf.length;

    // 2. Module Name
    view.setUint8(offset, modBuf.length);
    offset += 1;
    new Uint8Array(buffer, offset, modBuf.length).set(modBuf);
    offset += modBuf.length;

    // 3. Payload (4 байта, Big Endian)
    view.setUint32(offset, payBuf.length, false);
    offset += 4;
    new Uint8Array(buffer, offset, payBuf.length).set(payBuf);

    return buffer;
}