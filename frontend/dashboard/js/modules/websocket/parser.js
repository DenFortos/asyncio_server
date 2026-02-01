const decoder = new TextDecoder();
const jsonModules = ['AuthModule', 'DataScribe', 'ClientList', 'AuthUpdate'];

const readStr = (view, offset) => {
    const len = view.getUint8(offset);
    const str = decoder.decode(new Uint8Array(view.buffer, offset + 1, len));
    return { str, next: offset + 1 + len };
};

export function parseBinaryMessage(buffer) {
    if (!buffer || buffer.byteLength < 6) return null;

    try {
        const view = new DataView(buffer);
        const id = readStr(view, 0);
        const mod = readStr(view, id.next);
        const pLen = view.getUint32(mod.next, false);
        const pStart = mod.next + 4;

        let payload = null;
        if (pLen > 0) {
            const raw = new Uint8Array(buffer, pStart, pLen);
            const isJson = jsonModules.includes(mod.str) || mod.str.endsWith('Response');
            payload = isJson ? JSON.parse(decoder.decode(raw)) : raw;
        }

        return { id: id.str, module: mod.str, payload };
    } catch (e) {
        console.error('[Parser Error]', e);
        return null;
    }
}