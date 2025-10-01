// Файл: output.js
// Описание: Управление аудио-выходом (системный звук)
// Используется для включения/выключения передачи системного звука

// Обработка Audio Output (независимо от Audio Input)
function toggleAudioOutput() {
  window.audioOutputState = !window.audioOutputState;
  updateAudioIcons();

  if (window.audioOutputState) {
    sendCommandToClient('start_audio_output');
  } else {
    sendCommandToClient('stop_audio_output'); // Отправляем команду OFF
  }
}

// Экспортируем функцию в глобальный объект
window.toggleAudioOutput = toggleAudioOutput;