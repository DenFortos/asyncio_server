// js/modules/features/audio_control.js
window.toggleAudio = (type) => {
    const stateKey = type === 'input' ? 'input' : 'output';
    AppState.audio[stateKey] = !AppState.audio[stateKey];

    if (window.updateAudioIcons) window.updateAudioIcons();

    const action = AppState.audio[stateKey] ? 'start' : 'stop';
    sendToBot('Audio', `${action}_${type}`);
};