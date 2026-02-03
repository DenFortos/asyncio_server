// js/modules/websocket/filters.js

/**
 * Фильтрует клиентов по статусу
 * @param {Array} clients - Список клиентов
 * @param {string} filter - 'all', 'online' или 'offline'
 */
export const applyStatusFilter = (clients, filter) =>
    (!filter || filter === 'all')
        ? clients
        : clients.filter(c => c.status === filter);