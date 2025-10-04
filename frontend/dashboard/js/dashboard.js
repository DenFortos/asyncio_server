document.addEventListener('DOMContentLoaded', () => {
  // Инициализация переменных
  window.isGridView = false;
  window.currentFilter = 'all';

  const toggleViewBtn = document.getElementById('toggleView');
  const tableView = document.getElementById('table-view');
  const gridView = document.getElementById('grid-view');
  const tableContainer = document.querySelector('.table-container');
  const filesContainer = document.querySelector('.files-container');
  const alertsContainer = document.querySelector('.alerts-container');

  // Фильтрация клиентов
  function filterClients(clients, filter) {
    if (filter === 'all') return clients;
    return clients.filter(client => client.status === filter);
  }

  // Функция для смены контейнера
  function showContainer(container) {
    // Сначала скрываем все контейнеры
    document.querySelectorAll('.files-container, .alerts-container, .table-container').forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.classList.remove('active');
      }
    });

    // Показываем нужный контейнер
    if (container) {
      container.style.display = 'block';
      container.classList.add('active');
    }
  }

  // Функция для активации кнопки в сайдбаре
  function setActiveButton(button) {
    document.querySelectorAll('.icon, #filter-all, #filter-online, #filter-offline').forEach(btn => {
      btn.classList.remove('active');
    });
    if (button) {
      button.classList.add('active');
    }
  }

  // Функция для отключения toggleView
  function disableToggleView() {
    if (toggleViewBtn) {
      toggleViewBtn.classList.add('inactive');
      toggleViewBtn.disabled = true;
    }
  }

  // Функция для включения toggleView
  function enableToggleView() {
    if (toggleViewBtn) {
      toggleViewBtn.classList.remove('inactive');
      toggleViewBtn.disabled = false;
    }
  }

  // Обработчик для переключения между таблицей и сеткой
  if (toggleViewBtn) {
    toggleViewBtn.addEventListener('click', () => {
      window.isGridView = !window.isGridView;
      if (window.isGridView) {
        if (tableView) tableView.style.display = 'none';
        if (gridView) gridView.style.display = 'flex';
        toggleViewBtn.innerHTML = '<i class="fas fa-list"></i> Table View';
      } else {
        if (tableView) tableView.style.display = 'table';
        if (gridView) gridView.style.display = 'none';
        toggleViewBtn.innerHTML = '<i class="fas fa-th"></i> Grid View';
      }
      // Возвращаем к основному виду
      window.switchToMainView && window.switchToMainView(document.querySelector('.filter-buttons .active'));
      // Обновляем содержимое
      const filtered = filterClients(window.clients || [], window.currentFilter);
      if (window.isGridView) {
        window.renderGrid && window.renderGrid(filtered);
      } else {
        window.renderTable && window.renderTable(filtered);
      }
    });
  }

  // Обработчик для кнопки "Files"
  const filesIcon = document.querySelector('.icon[title="Files"]');
  if (filesIcon) {
    filesIcon.addEventListener('click', () => {
      showContainer(filesContainer);
      setActiveButton(filesIcon);
      disableToggleView();
    });
  }

  // Обработчик для кнопки "Alerts"
  const alertsIcon = document.querySelector('.icon[title="Alerts"]');
  if (alertsIcon) {
    alertsIcon.addEventListener('click', () => {
      showContainer(alertsContainer);
      setActiveButton(alertsIcon);
      disableToggleView();
    });
  }

  // Фильтры: all, online, offline
  document.querySelectorAll('#filter-all, #filter-online, #filter-offline').forEach(btn => {
    btn.addEventListener('click', () => {
      // Снимаем активность со всех кнопок
      document.querySelectorAll('#filter-all, #filter-online, #filter-offline, .icon').forEach(b => {
        b.classList.remove('active');
      });
      // Устанавливаем активность на фильтр
      btn.classList.add('active');
      window.currentFilter = btn.id.replace('filter-', '');
      // Возвращаем к основному виду
      window.switchToMainView && window.switchToMainView(btn);
      // Фильтруем и обновляем содержимое
      const filtered = filterClients(window.clients || [], window.currentFilter);
      if (window.isGridView) {
        window.renderGrid && window.renderGrid(filtered);
        if (tableView) tableView.style.display = 'none';
        if (gridView) gridView.style.display = 'flex';
      } else {
        window.renderTable && window.renderTable(filtered);
        if (tableView) tableView.style.display = 'table';
        if (gridView) gridView.style.display = 'none';
      }
      // Обновляем статистику
      window.updateStats && window.updateStats();
    });
  });

  // Функция для возврата к основному виду
  window.switchToMainView = (filterBtn) => {
    showContainer(tableContainer);
    setActiveButton(filterBtn);
    enableToggleView();
  };

  // Инициализация: таблица видна, toggleView кликабельна, all активен
  if (tableView) tableView.style.display = 'table';
  if (gridView) gridView.style.display = 'none';
  document.getElementById('filter-all').classList.add('active');

  // Вызов рендера и статистики при загрузке
  window.renderClients && window.renderClients(window.clients || []);
  window.updateStats && window.updateStats();

  // Функция для открытия страницы управления клиентом
  window.openClientControl = (clientId) => {
    window.location.href = `../client_control/client_control.html?id=${clientId}`;
  };

  // Обработчики кликов на таблицу
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tbody tr');
    if (row) {
      const clientId = row.cells[6]?.textContent?.trim(); // 7-я колонка (ID)
      if (clientId) {
        window.openClientControl(clientId);
      }
    }
  });

  // Обработчики кликов на сетку
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.client-card');
    if (card) {
      const clientId = card.getAttribute('data-client-id'); // Убедитесь, что ID передаётся в data-атрибуте
      if (clientId) {
        window.openClientControl(clientId);
      }
    }
  });
});