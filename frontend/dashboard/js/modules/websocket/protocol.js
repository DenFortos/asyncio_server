/* frontend/dashboard/js/modules/websocket/protocol.js */

/**
 * ЕДИНЫЙ БИНАРНЫЙ ПРОТОКОЛ [Header 6b] + [Body]
 * Header: [ID_LEN (1b)][MOD_LEN (1b)][PAY_LEN (4b)]
 * Body:   [ID][MODULE][PAYLOAD]
 */

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * Декодирует пакет из ArrayBuffer
 * @param {ArrayBuffer} buf
 * @returns {Object|null} {id, module, payload}
 */
export function decodePacket(buf) {
    if (!buf || buf.byteLength < 6) return null;

    try {
        const view = new DataView(buf);

        // 1. Читаем тех-карту (заголовок 6 байт)
        const idLen  = view.getUint8(0);
        const modLen = view.getUint8(1);
        const payLen = view.getUint32(2, false);

        // 2. Расчет смещений
        const idStart  = 6;
        const modStart = idStart + idLen;
        const payStart = modStart + modLen;

        // 3. Извлечение данных (используем Uint8Array для корректного среза)
        const id      = decoder.decode(new Uint8Array(buf, idStart, idLen)).replace(/\0/g, '');
        const module  = decoder.decode(new Uint8Array(buf, modStart, modLen));
        const payload = buf.slice(payStart, payStart + payLen);

        return { id, module, payload };
    } catch (e) {
        console.error("[Protocol] Decode Error:", e);
        return null;
    }
}

/**
 * Кодирует данные в ArrayBuffer для отправки
 * @param {string} id - ID бота (или пустая строка для сервера)
 * @param {string} mod - Имя модуля
 * @param {string|Uint8Array|Array} pay - Полезная нагрузка
 * @returns {ArrayBuffer}
 */
export function encodePacket(id, mod, pay = "") {
    // Подготовка контента
    const bId  = encoder.encode(id);
    const bMod = encoder.encode(mod);

    // Автоматическая конвертация payload в байты
    let bPay;
    if (typeof pay === 'string') {
        bPay = encoder.encode(pay);
    } else if (pay instanceof Uint8Array) {
        bPay = pay;
    } else {
        bPay = new Uint8Array(pay);
    }

    // Аллокация памяти: 6 байт заголовка + тело
    const buf = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    const view = new DataView(buf.buffer);

    // Запись заголовка
    view.setUint8(0, bId.length);
    view.setUint8(1, bMod.length);
    view.setUint32(2, bPay.length, false);

    // Запись тела
    buf.set(bId, 6);
    buf.set(bMod, 6 + bId.length);
    buf.set(bPay, 6 + bId.length + bMod.length);

    return buf.buffer;
}