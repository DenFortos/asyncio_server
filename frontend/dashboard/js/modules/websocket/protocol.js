/* frontend/dashboard/js/modules/websocket/protocol.js */
const decoder = new TextDecoder(), encoder = new TextEncoder();
// Модули, которые всегда содержат JSON в payload
const JSON_MODS = ['AuthModule', 'DataScribe', 'ClientList', 'AuthUpdate', 'Heartbeat'];

const readStr = (view, off) => {
    const len = view.getUint8(off);
    const str = decoder.decode(new Uint8Array(view.buffer, off + 1, len));
    return { str, next: off + 1 + len };
};

export const isJson = (mod) => JSON_MODS.includes(mod) || mod.endsWith('Response');

export function decodePacket(buf) {
    if (!buf || buf.byteLength < 6) return null;
    try {
        const view = new DataView(buf);
        const id = readStr(view, 0);
        const mod = readStr(view, id.next);
        const pLen = view.getUint32(mod.next, false);
        return {
            id: id.str,
            module: mod.str,
            payload: buf.slice(mod.next + 4, mod.next + 4 + pLen)
        };
    } catch (e) { return null; }
}

export function encodePacket(id, mod, pay = []) {
    // Если pay это строка (например "ping"), конвертируем в байты
    const payloadData = typeof pay === 'string' ? encoder.encode(pay) : pay;
    const bId = encoder.encode(id), bMod = encoder.encode(mod), bPay = new Uint8Array(payloadData);

    const buf = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    let off = 0;

    buf[off++] = bId.length; buf.set(bId, off); off += bId.length;
    buf[off++] = bMod.length; buf.set(bMod, off); off += bMod.length;

    new DataView(buf.buffer).setUint32(off, bPay.length, false);
    buf.set(bPay, off + 4);
    return buf.buffer;
}