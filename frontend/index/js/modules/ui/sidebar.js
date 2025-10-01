// Функции управления боковой панелью (бургер-меню)
document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('expanded');
});