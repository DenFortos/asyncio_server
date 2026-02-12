// frontend/dashboard/js/modules/data/stats.js

import { getAllClients } from './clients.js';

/**
 * Обновляет счетчики в шапке (Online, Offline, Total)
 */
export const updateStats = () => {
    const clients = getAllClients();

    // Считаем статусы за один проход
    const stats = clients.reduce((acc, { status }) => {
        acc[status === 'online' ? 'online' : 'offline']++;
        return acc;
    }, { online: 0, offline: 0 });

    const data = {
        'online-count': stats.online,
        'offline-count': stats.offline,
        'total-count': clients.length
    };

    // Обновляем только если значения изменились (мини-оптимизация)
    Object.entries(data).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(val)) {
            el.textContent = val;
        }
    });
};

// Подписка на события обновления данных
['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(event =>
    document.addEventListener(event, updateStats)
);