// frontend/dashboard/js/modules/data/stats.js

import { getAllClients } from './clients.js';

/**
 * Обновляет счетчики в хедере или на дашборде
 */
const updateStats = () => {
    const clients = getAllClients();

    // Считаем всё за один проход вместо трех фильтров
    const stats = clients.reduce((acc, c) => {
        acc[c.status === 'online' ? 'online' : 'offline']++;
        return acc;
    }, { online: 0, offline: 0 });

    // Массовое обновление DOM
    const mapping = {
        'online-count': stats.online,
        'offline-count': stats.offline,
        'total-count': clients.length
    };

    Object.entries(mapping).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
};

// Подписка на все события обновления данных разом
['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev =>
    document.addEventListener(ev, updateStats)
);

export { updateStats };