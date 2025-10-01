// Основной файл инициализации (переключение вида и глобальные переменные)
document.addEventListener('DOMContentLoaded', () => {
  // Обработчик для переключения вида таблица/сетка
  document.getElementById('toggleView').addEventListener('click', () => {
    window.isGridView = !window.isGridView;

    const toggleBtn = document.getElementById('toggleView');
    if (window.isGridView) {
      toggleBtn.innerHTML = '<i class="fas fa-table"></i> Table View';
    } else {
      toggleBtn.innerHTML = '<i class="fas fa-th"></i> Grid View';
    }

    document.querySelector('.filter-buttons .active').classList.remove('active');
    document.getElementById('filter-all').classList.add('active');
    window.currentFilter = 'all';
    filterClients('all');
  });

  // Инициализация
  window.isGridView = false;
  window.currentFilter = 'all';
  window.renderClients(window.clients);
  window.updateStats();
});