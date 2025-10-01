// Основная функция рендера (переключение между таблицей и сеткой)
function renderClients(data) {
  const tableView = document.getElementById('table-view');
  const gridView = document.getElementById('grid-view');

  if (window.isGridView) {
    tableView.style.display = 'none';
    gridView.style.display = 'flex';
    window.renderGrid(data);
  } else {
    tableView.style.display = 'table';
    gridView.style.display = 'none';
    window.renderTable(data);
  }
}

// Экспортируем всё в глобальный объект window
window.renderClients = renderClients;