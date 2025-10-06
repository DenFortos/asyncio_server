// js/modules/ui/sidebar.js

/**
 * Инициализирует логику сворачивания/разворачивания боковой панели.
 */
function initializeSidebarToggle() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');

  menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('expanded');
  });

  // ВАЖНО: Мы удаляем весь блок document.querySelector('.sidebar').addEventListener('click', ...)
  // так как он дублирует логику управления вкладками из dashboard.js.
}

// Запуск инициализации после загрузки DOM
document.addEventListener('DOMContentLoaded', initializeSidebarToggle);