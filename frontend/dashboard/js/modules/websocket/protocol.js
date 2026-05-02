// frontend/dashboard/js/modules/websocket/protocol.js
const dec = new TextDecoder();
const enc = new TextEncoder();

export const decodePacket = (buffer) => {
    if (!buffer || buffer.byteLength < 8) return null;
    try {
        const view = new DataView(buffer);
        const id_len = view.getUint8(0);
        const mod_len = view.getUint16(1, false);
        
        // Расчет длины payload (5 байт)
        const p1 = view.getUint8(3);
        const p2 = view.getUint32(4, false);
        const pay_len = (p1 * 0x100000000) + p2;

        const id = dec.decode(new Uint8Array(buffer, 8, id_len));
        const mod_offset = 8 + id_len;
        const mod_raw = dec.decode(new Uint8Array(buffer, mod_offset, mod_len));
        
        // ИСПРАВЛЕНИЕ: Используем | для разделения метаданных
        const parts = mod_raw.split('|');
        const module = parts[0] || 'Unknown';
        const type = parts[1] || 'bin';
        const action = parts[2] || 'none';
        const extra = parts[3] || 'none';

        const pay_offset = mod_offset + mod_len;
        const payload_raw = new Uint8Array(buffer, pay_offset, pay_len);
        let finalPayload = payload_raw;

        if (type === 'bin') {
            finalPayload = payload_raw.slice().buffer; 
        } else {
            const text = dec.decode(payload_raw);
            if (type === 'json') {
                try { finalPayload = JSON.parse(text); } catch { finalPayload = {}; }
            } else if (type === 'int') {
                finalPayload = parseInt(text) || 0;
            } else {
                finalPayload = text;
            }
        }
        
        // Совместимость с Renderer
        if (finalPayload && finalPayload.loc) {
            finalPayload.location = finalPayload.loc;
        }
        return { id, module, type, action, extra, payload: finalPayload };
    } catch (e) {
        console.error("[V8] Decode Failure", e);
        return null;
    }
};

export const encodePacket = (id, module, type = 'str', action = 'None', extra = 'None', payload = "") => {
    const b_id = enc.encode(String(id).trim());
    
    // ИСПРАВЛЕНИЕ: Формируем строку MOD_BODY через пайп |
    const b_mod = enc.encode(`${module}|${type}|${action}|${extra}`);
    
    let b_pay;
    if (payload instanceof ArrayBuffer) b_pay = new Uint8Array(payload);
    else if (payload instanceof Uint8Array) b_pay = payload;
    else if (type === 'json') b_pay = enc.encode(JSON.stringify(payload));
    else b_pay = enc.encode(String(payload));

    const res = new Uint8Array(8 + b_id.length + b_mod.length + b_pay.length);
    const view = new DataView(res.buffer);
    
    // Заголовок (1 + 2 + 5 байт)
    view.setUint8(0, b_id.length);
    view.setUint16(1, b_mod.length, false);
    view.setUint8(3, Math.floor(b_pay.length / 0x100000000));
    view.setUint32(4, b_pay.length % 0x100000000, false);

    res.set(b_id, 8);
    res.set(b_mod, 8 + b_id.length);
    res.set(b_pay, 8 + b_id.length + b_mod.length);
    
    return res.buffer;
};