// Файл: input.js
// Описание: Управление аудио-входом (микрофон)
// Используется для включения/выключения передачи звука с микрофона

// Обработка Audio Input (независимо от Audio Output)
function toggleAudioInput() {
  window.audioInputState = !window.audioInputState;
  updateAudioIcons();

  if (window.audioInputState) {
    sendCommandToClient('start_audio_input');
  } else {
    sendCommandToClient('stop_audio_input'); // Отправляем команду OFF
  }
}

// Экспортируем функцию в глобальный объект
window.toggleAudioInput = toggleAudioInput;