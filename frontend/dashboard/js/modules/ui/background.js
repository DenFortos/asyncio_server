// js/modules/ui/background.js

/**
 * Устанавливает фон страницы и сохраняет его в локальном хранилище.
 * @param {string} imagePath - Путь к фоновому изображению.
 */
function setBackground(imagePath) {
  document.body.style.backgroundImage = `url(${imagePath})`;
  localStorage.setItem('selectedBackground', imagePath);
}

/**
 * Инициализирует функционал модального окна выбора фона.
 */
function initializeBackgroundUI() {
  const bgModal = document.getElementById('bgModal');
  const bgButton = document.getElementById('bgButton');
  const closeModal = document.getElementById('closeModal');
  const bgOptions = document.querySelectorAll('.bg-option');

  // 1. Открытие модального окна
  bgButton?.addEventListener('click', () => {
    if (bgModal) bgModal.style.display = 'block';
  });

  // 2. Закрытие модального окна
  closeModal?.addEventListener('click', () => {
    if (bgModal) bgModal.style.display = 'none';
  });

  // 3. Обработка выбора фона
  bgOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const bgName = e.currentTarget.getAttribute('data-bg');
      const imagePath = `../images/${bgName}.jpg`;

      setBackground(imagePath);
      if (bgModal) bgModal.style.display = 'none';
    });
  });

  // 4. Закрытие по клику вне модального окна
  window.addEventListener('click', (e) => {
      if (e.target === bgModal) {
          if (bgModal) bgModal.style.display = 'none';
      }
  });
}

// ----------------------------------------------------------------
// ГЛАВНОЕ ИСПРАВЛЕНИЕ: Мгновенное применение фона
// ----------------------------------------------------------------

// 1. Сначала загружаем сохраненный фон немедленно, как только скрипт загружен.
const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) {
  document.body.style.backgroundImage = `url(${savedBg})`;
} else {
  // 2. Если фона нет, устанавливаем фон по умолчанию.
  // Если у вас есть фон по умолчанию в CSS, этот блок можно удалить.
  // Если нет, вставьте путь к фону по умолчанию:
  // setBackground('../images/bg1.jpg');
}


// 3. Инициализация UI (кнопки, модальное окно) запускается только после DOMContentLoaded.
document.addEventListener('DOMContentLoaded', initializeBackgroundUI);

export { setBackground, initializeBackgroundUI };