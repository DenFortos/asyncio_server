// Файл: sidebar.js
// Описание: Управление боковой панелью (бургер-меню и иконки функций)
// Используется для переключения между разделами и выдвижения сайдбара

// Обработка кликов по функциям в сайдбаре
document.querySelectorAll('.icons .icon').forEach(icon => {
  icon.addEventListener('click', () => {
    const fn = icon.getAttribute('data-function');

    if (fn === 'desktop' || fn === 'webcam') {
      document.querySelectorAll('.icon[data-function="desktop"], .icon[data-function="webcam"]')
        .forEach(i => i.classList.remove('active'));
      icon.classList.add('active');
    }

    switch(fn) {
      case 'desktop':
        showDesktopView();
        break;
      case 'webcam':
        showWebcamView();
        break;
      case 'audio-output':
        toggleAudioOutput();
        break;
      case 'audio-input':
        toggleAudioInput();
        break;
    }
  });
});

// Переключение сайдбара
document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('expanded');
});