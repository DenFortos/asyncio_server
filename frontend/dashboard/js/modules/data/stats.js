/* frontend/dashboard/js/modules/data/stats.js */
import { getAllClients } from './clients.js';

window.addEventListener('clientsUpdated', () => {
    const list = getAllClients();
    const counts = list.reduce((acc, c) => {
        acc[c.status === 'online' ? 'online' : 'offline']++;
        return acc;
    }, { online: 0, offline: 0 });
    
    const map = {
        'online-count': counts.online,
        'offline-count': counts.offline,
        'total-count': list.length
    };

    Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
});