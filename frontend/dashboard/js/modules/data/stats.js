// Обновление статистики "Online", "Offline", "Total".
function updateStats() {
  const online = window.clients.filter(c => c.status === 'online').length;
  const offline = window.clients.filter(c => c.status === 'offline').length;

  document.getElementById('online-count').textContent = online;
  document.getElementById('offline-count').textContent = offline;
  document.getElementById('total-count').textContent = window.clients.length;
}

// Экспортируем всё в глобальный объект window
window.updateStats = updateStats;