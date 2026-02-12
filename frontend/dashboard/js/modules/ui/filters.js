// frontend/dashboard/js/modules/ui/filters.js

/**
 * Фильтрует клиентов по статусу (all, online, offline)
 */
export const applyStatusFilter = (clients, filter) =>
    (!filter || filter === 'all')
        ? clients
        : clients.filter(c => c.status?.toLowerCase() === filter.toLowerCase());