// Файл: buttons.js
// Описание: Управление кнопками управления (Observation, Control, Webcam)
// Используется для переключения состояний кнопок и обновления их визуального стиля

// Обработка кнопки Observation
document.getElementById('observeBtn').addEventListener('click', () => {
  window.observeState = !window.observeState;
  updateObserveButton();

  if (window.observeState) {
    startWebRTCStream('clientId');
    sendCommandToClient('start_desktop_stream');
  } else {
    stopWebRTCStream();
    sendCommandToClient('stop_desktop_stream'); // Отправляем команду OFF
  }
});

// Обработка кнопки Control
document.getElementById('controlBtn').addEventListener('click', () => {
  window.controlState = !window.controlState;
  updateControlButton();

  if (window.controlState) {
    sendCommandToClient('start_control');
  } else {
    sendCommandToClient('stop_control'); // Отправляем команду OFF
  }
});

// Обработка кнопки Webcam
document.getElementById('webcamToggleBtn').addEventListener('click', () => {
  window.webcamState = !window.webcamState;
  updateWebcamButton();

  if (window.webcamState) {
    sendCommandToClient('start_webcam');
  } else {
    clearStream('webcamFeed');
    sendCommandToClient('stop_webcam'); // Отправляем команду OFF
  }
});

// Функции обновления кнопок
function updateObserveButton() {
  const btn = document.getElementById('observeBtn');
  const status = document.getElementById('observeStatus');
  if (window.observeState) {
    btn.classList.remove('observe-off');
    btn.classList.add('observe-on');
    status.textContent = 'ON';
  } else {
    btn.classList.remove('observe-on');
    btn.classList.add('observe-off');
    status.textContent = 'OFF';
  }
}

function updateControlButton() {
  const btn = document.getElementById('controlBtn');
  const status = document.getElementById('controlStatus');
  if (window.controlState) {
    btn.classList.remove('control-off');
    btn.classList.add('control-on');
    status.textContent = 'ON';
  } else {
    btn.classList.remove('control-on');
    btn.classList.add('control-off');
    status.textContent = 'OFF';
  }
}

function updateWebcamButton() {
  const btn = document.getElementById('webcamToggleBtn');
  const status = document.getElementById('webcamStatus');
  if (window.webcamState) {
    btn.classList.remove('webcam-off');
    btn.classList.add('webcam-on');
    status.textContent = 'ON';
  } else {
    btn.classList.remove('webcam-on');
    btn.classList.add('webcam-off');
    status.textContent = 'OFF';
  }
}

// Экспортируем функции в глобальный объект
window.updateObserveButton = updateObserveButton;
window.updateControlButton = updateControlButton;
window.updateWebcamButton = updateWebcamButton;