/* frontend/dashboard/js/modules/websocket/protocol.js */
const dec = new TextDecoder(), enc = new TextEncoder();

export function decodePacket(buf) {
    if (!buf || buf.byteLength < 6) return null;
    try {
        const v = new DataView(buf);
        const [idL, modL, payL] = [v.getUint8(0), v.getUint8(1), v.getUint32(2, false)];
        const id = dec.decode(new Uint8Array(buf, 6, idL)).replace(/\0/g, '');
        const mod = dec.decode(new Uint8Array(buf, 6 + idL, modL));
        const pay = buf.slice(6 + idL + modL, 6 + idL + modL + payL);
        return { id, module: mod, payload: pay };
    } catch (e) { return null; }
}

export function encodePacket(id, mod, pay = "") {
    const bId = enc.encode(id), bMod = enc.encode(mod);
    const bPay = pay instanceof Uint8Array ? pay : enc.encode(String(pay));
    const res = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    const v = new DataView(res.buffer);

    v.setUint8(0, bId.length); 
    v.setUint8(1, bMod.length); 
    v.setUint32(2, bPay.length, false);

    res.set(bId, 6);
    res.set(bMod, 6 + bId.length);
    res.set(bPay, 6 + bId.length + bMod.length);

    return res.buffer;
}