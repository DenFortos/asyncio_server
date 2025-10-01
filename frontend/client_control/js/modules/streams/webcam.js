// Файл: webcam.js
// Описание: Управление видеопотоком вебкамеры (WebRTC)
// Используется для подключения и отключения потока с камеры

// Загрузка вебкамеры (заглушка)
function loadWebcamFeed() {
  const webcamFeed = document.getElementById('webcamFeed');
  const webcamPlaceholder = document.getElementById('webcamPlaceholder');

  // В реальном приложении здесь будет подключение к вебкамере
  webcamPlaceholder.style.display = 'block';
  webcamFeed.style.display = 'none';
}

// Экспортируем функцию в глобальный объект
window.loadWebcamFeed = loadWebcamFeed;