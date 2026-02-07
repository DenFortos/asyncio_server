// frontend/client_control/js/ui_logic.js
export const toggleFeature = (id, stateObj, key, mod, cmds, onStop) => {
    stateObj[key] = !stateObj[key];
    const state = stateObj[key];
    const btn = document.getElementById(id);

    if (btn) {
        const type = id.replace(/(Btn|ToggleBtn)$/, '').toLowerCase();
        btn.className = `control-btn ${type}-${state ? 'on' : 'off'}`;
        btn.querySelector('span').textContent = state ? 'ON' : 'OFF';
    }

    window.sendToBot?.(mod, state ? cmds[0] : cmds[1]);
    if (!state) onStop?.();
};

export function switchView(view) {
    const [isDesk, isCam] = [view === 'desktop', view === 'webcam'];

    document.getElementById('desktopContainer').style.display = isDesk ? 'flex' : 'none';
    document.getElementById('webcamContainer').style.display = isCam ? 'flex' : 'none';
    document.getElementById('functionContainer').style.display = (isDesk || isCam) ? 'none' : 'flex';

    if (!isDesk) {
        if (AppState.desktop.observe) window.toggleObserve();
        if (AppState.desktop.control) window.toggleControl();
    }
    if (!isCam && AppState.webcam.active) window.toggleWebcam();
}