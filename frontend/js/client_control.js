// Файл: client_control.js
// Описание: Основной файл инициализации и общей логики
// Используется для запуска всех функций при загрузке страницы

document.addEventListener('DOMContentLoaded', () => {
  // Сбрасываем все состояния при загрузке страницы
  resetAllStates();

  // Отправляем команды OFF для всех при загрузке страницы
  sendCommandToClient('stop_desktop_stream');
  sendCommandToClient('stop_control');
  sendCommandToClient('stop_webcam');
  sendCommandToClient('stop_audio_output');
  sendCommandToClient('stop_audio_input');

  // Инициализируем данные клиента
  initClientData();

  // Показываем Remote Desktop по умолчанию
  showDesktopView();
  updateObserveButton();
  updateControlButton();
  updateWebcamButton();
  updateAudioIcons();
});

// Функция обновления иконок аудио (независимо от других)
function updateAudioIcons() {
  const audioOutputIcon = document.querySelector('.icon[data-function="audio-output"]');
  const audioInputIcon = document.querySelector('.icon[data-function="audio-input"]');

  audioOutputIcon.classList.toggle('active', window.audioOutputState);
  audioInputIcon.classList.toggle('active', window.audioInputState);
}

// Экспортируем функцию в глобальный объект
window.updateAudioIcons = updateAudioIcons;