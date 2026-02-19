/* frontend/dashboard/js/modules/websocket/protocol.js */

/* ==========================================================================
   1. КОНСТАНТЫ И ИНСТРУМЕНТЫ (Tools)
========================================================================== */

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/* ==========================================================================
   2. ДЕКОДИРОВАНИЕ ПАКЕТА (Decoding)
========================================================================== */

/**
 * Превращает ArrayBuffer в объект {id, module, payload}
 * [Header 6b: ID_LEN(1), MOD_LEN(1), PAY_LEN(4)] + [Body]
 */
export function decodePacket(buf) {
    if (!buf || buf.byteLength < 6) return null;

    try {
        const view = new DataView(buf);

        // Чтение заголовка (техническая карта пакета)
        const idLen  = view.getUint8(0);
        const modLen = view.getUint8(1);
        const payLen = view.getUint32(2, false);

        // Расчет точек входа для данных
        const idStart  = 6;
        const modStart = idStart + idLen;
        const payStart = modStart + modLen;

        // Извлечение строк и бинарного хвоста
        const id      = decoder.decode(new Uint8Array(buf, idStart, idLen)).replace(/\0/g, '');
        const module  = decoder.decode(new Uint8Array(buf, modStart, modLen));
        const payload = buf.slice(payStart, payStart + payLen);

        return { id, module, payload };
    } catch (e) {
        console.error("[Protocol] Decode Error:", e);
        return null;
    }
}

/* ==========================================================================
   3. КОДИРОВАНИЕ ПАКЕТА (Encoding)
========================================================================== */

/**
 * Собирает данные в бинарный пакет для отправки по сети
 */
export function encodePacket(id, mod, pay = "") {
    // Подготовка текстовых полей
    const bId  = encoder.encode(id);
    const bMod = encoder.encode(mod);

    // Подготовка полезной нагрузки (строка или байты)
    let bPay;
    if (typeof pay === 'string') {
        bPay = encoder.encode(pay);
    } else if (pay instanceof Uint8Array) {
        bPay = pay;
    } else {
        bPay = new Uint8Array(pay);
    }

    // Аллокация памяти: заголовок (6б) + ID + Модуль + Данные
    const buf = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    const view = new DataView(buf.buffer);

    // Запись метаданных в первые 6 байт
    view.setUint8(0, bId.length);
    view.setUint8(1, bMod.length);
    view.setUint32(2, bPay.length, false);

    // Последовательная запись данных в буфер
    buf.set(bId, 6);
    buf.set(bMod, 6 + bId.length);
    buf.set(bPay, 6 + bId.length + bMod.length);

    return buf.buffer;
}