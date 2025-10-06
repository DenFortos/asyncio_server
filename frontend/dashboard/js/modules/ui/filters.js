// js/modules/ui/filters.js

/**
 * Применяет фильтр по статусу к списку клиентов.
 * @param {Array<Object>} clients - Массив клиентов.
 * @param {string} filter - Тип фильтра ('all', 'online', 'offline').
 * @returns {Array<Object>} Отфильтрованный массив.
 */
export function applyStatusFilter(clients, filter) {
  if (filter === 'all' || !filter) {
    return clients;
  }
  return clients.filter(c => c.status === filter);
}

// Удалены все document.addEventListener, чтобы избежать конфликта с dashboard.js