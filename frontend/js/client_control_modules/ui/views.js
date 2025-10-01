// Файл: views.js
// Описание: Управление переключением между видами (Remote Desktop, Webcam, Function)
// Используется для показа/скрытия контейнеров

function showDesktopView() {
  document.getElementById('desktopContainer').style.display = 'flex';
  document.getElementById('webcamContainer').style.display = 'none';
  document.getElementById('functionContainer').style.display = 'none';

  // Автоматически выключаем webcam при переходе на desktop
  if (window.webcamState) {
    window.webcamState = false;
    updateWebcamButton();
    clearStream('webcamFeed');
    sendCommandToClient('stop_webcam'); // Отправляем команду OFF
  }

  // Сбрасываем Observation и Take Control при переходе на другой раздел
  if (window.observeState) {
    window.observeState = false;
    updateObserveButton();
    sendCommandToClient('stop_desktop_stream'); // Отправляем команду OFF
  }
  if (window.controlState) {
    window.controlState = false;
    updateControlButton();
    sendCommandToClient('stop_control'); // Отправляем команду OFF
  }

  updateAudioIcons();
}

function showWebcamView() {
  document.getElementById('desktopContainer').style.display = 'none';
  document.getElementById('webcamContainer').style.display = 'flex';
  document.getElementById('functionContainer').style.display = 'none';

  // Сбрасываем Observation и Take Control при переходе на webcam
  if (window.observeState) {
    window.observeState = false;
    updateObserveButton();
    sendCommandToClient('stop_desktop_stream'); // Отправляем команду OFF
  }
  if (window.controlState) {
    window.controlState = false;
    updateControlButton();
    sendCommandToClient('stop_control'); // Отправляем команду OFF
  }

  // Webcam — сбрасываем только если была ON (по вашей логике)
  if (window.webcamState) {
    window.webcamState = false;
    updateWebcamButton();
    clearStream('webcamFeed');
    sendCommandToClient('stop_webcam'); // Отправляем команду OFF
  }

  updateAudioIcons();
}

function showFunctionView(title, content) {
  document.getElementById('desktopContainer').style.display = 'none';
  document.getElementById('webcamContainer').style.display = 'none';
  document.getElementById('functionContainer').style.display = 'flex';
  document.querySelector('.welcome-message h2').textContent = title;
  document.querySelector('.welcome-message p').innerHTML = content;
}