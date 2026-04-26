// frontend/dashboard/js/modules/websocket/protocol.js
const dec = new TextDecoder();
const enc = new TextEncoder();

export const decodePacket = (buf) => {
    if (!buf || buf.byteLength < 6) return null;
    try {
        const v = new DataView(buf);
        const idL = v.getUint8(0);
        const modL = v.getUint8(1);
        const payL = v.getUint32(2, false);

        const id = dec.decode(new Uint8Array(buf, 6, idL)).replace(/\0/g, '');
        const rawModule = dec.decode(new Uint8Array(buf, 6 + idL, modL));
        const [module, meta] = rawModule.includes(':') ? rawModule.split(':') : [rawModule, 'None'];

        // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Создаем независимый массив байтов для Payload
        const payloadOffset = 6 + idL + modL;
        let payload = buf.slice(payloadOffset, payloadOffset + payL);

        // Если это превью или стрим, возвращаем как ArrayBuffer
        if (module.startsWith("Preview") || module.includes("Stream")) {
            return { id, module, meta, payload };
        }

        if (payload.byteLength === 4) {
            return { id, module, meta, payload: new DataView(payload).getUint32(0, false) };
        }

        const str = dec.decode(payload);
        try { return { id, module, meta, payload: JSON.parse(str) }; } 
        catch (e) { return { id, module, meta, payload: str }; }
    } catch (e) {
        console.error("[Protocol] Decode Error:", e);
        return null;
    }
};

export const encodePacket = (id, mod, pay = "") => {
    const bId = enc.encode(id);
    const bMod = enc.encode(mod);
    let bPay;
    if (pay instanceof Uint8Array) bPay = pay;
    else if (pay instanceof ArrayBuffer) bPay = new Uint8Array(pay);
    else if (typeof pay === "number") { bPay = new Uint8Array(4); new DataView(bPay.buffer).setUint32(0, pay, false); }
    else if (typeof pay === "object" && pay !== null) bPay = enc.encode(JSON.stringify(pay));
    else bPay = enc.encode(String(pay));

    const res = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    const v = new DataView(res.buffer);
    v.setUint8(0, bId.length);
    v.setUint8(1, bMod.length);
    v.setUint32(2, bPay.length, false);
    res.set(bId, 6);
    res.set(bMod, 6 + bId.length);
    res.set(bPay, 6 + bId.length + bMod.length);
    return res.buffer;
};