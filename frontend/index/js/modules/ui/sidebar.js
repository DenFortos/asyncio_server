// Функции управления боковой панелью (бургер-меню)
document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('expanded');
});

// Обработчики для иконок сайдбара через делегирование
document.addEventListener('DOMContentLoaded', () => {
  // Используем делегирование событий для иконок
  document.querySelector('.sidebar').addEventListener('click', (e) => {
    const icon = e.target.closest('.icon');
    if (icon) {
      console.log('Icon clicked:', icon.getAttribute('title')); // Отладочный лог

      // Проверяем, это кнопка Files?
      if (icon.getAttribute('title') === 'Files') {
        console.log('Files button clicked!'); // Отладочный лог

        // Проверим, что контейнеры существуют
        const tableContainer = document.querySelector('.table-container');
        const filesContainer = document.querySelector('.files-container');
        const toggleViewBtn = document.getElementById('toggleView');

        console.log('Containers found:', {
          table: !!tableContainer,
          files: !!filesContainer,
          toggle: !!toggleViewBtn
        });

        if (filesContainer && toggleViewBtn) {
          // Скрываем оба контейнера
          document.querySelectorAll('.files-container, .table-container').forEach(el => {
            if (el) {
              el.classList.remove('active');
              el.style.display = 'none';
            }
          });

          // Показываем контейнер файлов
          filesContainer.style.display = 'block';
          filesContainer.classList.add('active');

          // Активируем иконку
          document.querySelectorAll('.icon, #filter-all, #filter-online, #filter-offline').forEach(btn => {
            if (btn) btn.classList.remove('active');
          });
          icon.classList.add('active');

          // Отключаем кнопку переключения вида
          toggleViewBtn.classList.add('inactive');
          toggleViewBtn.disabled = true;

          console.log('Files view activated');
        }
      }
    }
  });

  // Функция для возврата к основному виду
  window.switchToMainView = (filterBtn) => {
    const tableContainer = document.querySelector('.table-container');
    const filesContainer = document.querySelector('.files-container');
    const toggleViewBtn = document.getElementById('toggleView');

    if (tableContainer && toggleViewBtn) {
      // Скрываем оба контейнера
      document.querySelectorAll('.files-container, .table-container').forEach(el => {
        if (el) {
          el.classList.remove('active');
          el.style.display = 'none';
        }
      });

      // Показываем контейнер таблицы
      tableContainer.style.display = 'block';
      tableContainer.classList.add('active');

      // Активируем кнопку фильтра
      document.querySelectorAll('.icon, #filter-all, #filter-online, #filter-offline').forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      if (filterBtn) filterBtn.classList.add('active');

      // Включаем кнопку переключения вида
      toggleViewBtn.classList.remove('inactive');
      toggleViewBtn.disabled = false;
    }
  };
});