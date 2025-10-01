// Файл: desktop.js
// Описание: Управление видеопотоком Remote Desktop (WebRTC)
// Используется для подключения и отключения потока экрана

// ========== Единые функции для управления потоками ==========
function setStream(videoId, stream) {
  const video = document.getElementById(videoId);
  video.srcObject = stream;
  video.style.display = 'block';
  document.getElementById(videoId.replace('Video', 'Placeholder')).style.display = 'none';
}

function clearStream(videoId) {
  const video = document.getElementById(videoId);
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  video.srcObject = null;
  video.style.display = 'none';
  document.getElementById(videoId.replace('Video', 'Placeholder')).style.display = 'block';
}

function startWebRTCStream(clientId) {
  console.log('WebRTC stream would start for client:', clientId);
}

function stopWebRTCStream() {
  console.log('WebRTC stream stopped');
  clearStream('desktopVideo');
}

// Экспортируем функции в глобальный объект
window.setStream = setStream;
window.clearStream = clearStream;
window.startWebRTCStream = startWebRTCStream;
window.stopWebRTCStream = stopWebRTCStream;