// Файл: states.js
// Описание: Управление состояниями всех функций (ON/OFF)
// Используется для отслеживания текущего состояния кнопок и иконок

// Состояния
let observeState = false;
let controlState = false;
let webcamState = false;
let audioOutputState = false;
let audioInputState = false;

// Функция сброса всех состояний (при загрузке страницы)
function resetAllStates() {
  observeState = false;
  controlState = false;
  webcamState = false;
  audioOutputState = false;
  audioInputState = false;
}

// Экспортируем состояния и функцию сброса в глобальный объект
window.observeState = observeState;
window.controlState = controlState;
window.webcamState = webcamState;
window.audioOutputState = audioOutputState;
window.audioInputState = audioInputState;
window.resetAllStates = resetAllStates;