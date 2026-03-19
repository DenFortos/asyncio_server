/* frontend/dashboard/js/modules/data/stats.js */
import { getAllClients } from './clients.js';

export const updateStats = () => {
    const clients = getAllClients();
    const stats = clients.reduce((acc, { status }) => {
        acc[status === 'online' ? 'online' : 'offline']++;
        return acc;
    }, { online: 0, offline: 0 });

    const updates = {
        'online-count': stats.online,
        'offline-count': stats.offline,
        'total-count': clients.length
    };

    Object.entries(updates).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(val)) {
            el.textContent = val;
        }
    });
};

['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(event =>
    window.addEventListener(event, updateStats)
);