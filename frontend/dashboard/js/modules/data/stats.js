// js/modules/data/stats.js

import { getAllClients } from './clients.js'; // Убедитесь, что путь правильный

/**
 * Обновляет статистику "Online", "Offline", "Total" в HTML-элементах.
 */
function updateStats() {
  const clients = getAllClients();

  const online = clients.filter(c => c.status === 'online').length;
  const offline = clients.filter(c => c.status === 'offline').length;
  const total = clients.length;

  // Обновление DOM
  document.getElementById('online-count').textContent = online;
  document.getElementById('offline-count').textContent = offline;
  document.getElementById('total-count').textContent = total;
}

// ----------------------------------------------------------------------
// Подписка на события для автоматического обновления
// ----------------------------------------------------------------------

document.addEventListener('clientsUpdated', updateStats);
document.addEventListener('clientUpdated', updateStats);
document.addEventListener('clientRemoved', updateStats);


// Экспорт, если вы планируете вызывать её вручную из других модулей (но подписки достаточно)
export { updateStats };