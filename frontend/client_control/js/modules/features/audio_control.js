/* frontend/client_control/js/modules/features/audio.js */

window.toggleAudio = (type) => {
    // type: 'input' (микрофон) или 'output' (динамики)
    const state = AppState.audio;
    state[type] = !state[type];

    const isActive = state[type];
    const icon = document.querySelector(`.icon[data-function="audio-${type}"]`);

    if (icon) {
        icon.classList.toggle('active', isActive);
        // Цветовая индикация: микрофон — красный, звук — зеленый Matrix
        if (isActive) {
            icon.style.color = (type === 'input') ? 'var(--accent-red)' : 'var(--accent-green)';
        } else {
            icon.style.color = '';
        }
    }

    const cmd = isActive ? 'start' : 'stop';
    window.sendToBot?.('Audio', `${cmd}_${type}`);
};