// frontend/dashboard/js/modules/websocket/protocol.js

const dec = new TextDecoder();
const enc = new TextEncoder(); // ДОБАВЛЕНО: Теперь энкодер определен

/** Декодирует входящий пакет V8.0 **/
export const decodePacket = (buffer) => {
    if (!buffer || buffer.byteLength < 8) return null;

    try {
        const view = new DataView(buffer);
        
        // 1. HEADER (8 bytes)
        const id_len = view.getUint8(0);
        const mod_len = view.getUint16(1, false); // BigEndian
        
        // Читаем 5 байт pay_len (3-7 байты включительно)
        const p1 = view.getUint8(3);
        const p2 = view.getUint32(4, false);
        const pay_len = (p1 * 0x100000000) + p2;

        // 2. Читаем ID
        const id = dec.decode(new Uint8Array(buffer, 8, id_len));
        
        // 3. Читаем MOD_BODY
        const mod_offset = 8 + id_len;
        const mod_raw = dec.decode(new Uint8Array(buffer, mod_offset, mod_len));
        
        const [module, type, action, extra] = mod_raw.split(':');

        // 4. Читаем PAYLOAD
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
                finalPayload = text; // str
            }
        }

        return { id, module, type, action, extra, payload: finalPayload };
    } catch (e) {
        console.error("[V8] Decode Failure:", e);
        return null;
    }
};

/** Кодирует данные в пакет V8.0 **/
export const encodePacket = (id, module, type = 'str', action = 'None', extra = 'None', payload = "") => {
    // 1. Подготовка текстовых компонентов
    const cleanId = String(id).trim();
    const b_id = enc.encode(cleanId);
    const b_mod = enc.encode(`${module}:${type}:${action}:${extra}`);
    
    // 2. Подготовка Payload
    let b_pay;
    if (payload instanceof ArrayBuffer) {
        b_pay = new Uint8Array(payload);
    } else if (payload instanceof Uint8Array) {
        b_pay = payload;
    } else if (type === 'int') {
        b_pay = new Uint8Array(4);
        new DataView(b_pay.buffer).setUint32(0, Number(payload), false);
    } else if (type === 'json') {
        b_pay = enc.encode(JSON.stringify(payload));
    } else {
        b_pay = enc.encode(String(payload));
    }

    // 3. Сборка финального буфера (Header 8 bytes + Body)
    const res = new Uint8Array(8 + b_id.length + b_mod.length + b_pay.length);
    const view = new DataView(res.buffer);

    // Заполнение заголовка
    view.setUint8(0, b_id.length);
    view.setUint16(1, b_mod.length, false);
    
    // 5 байт длины payload
    const pLen = b_pay.length;
    view.setUint8(3, Math.floor(pLen / 0x100000000));
    view.setUint32(4, pLen % 0x100000000, false);

    // Копирование данных
    res.set(b_id, 8);
    res.set(b_mod, 8 + b_id.length);
    res.set(b_pay, 8 + b_id.length + b_mod.length);

    return res.buffer;
};