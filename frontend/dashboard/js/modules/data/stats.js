/* frontend/dashboard/js/modules/data/stats.js */
import { getAllClients } from './clients.js';

window.addEventListener('clientsUpdated', () => {
    const list = getAllClients();
    const counts = list.reduce((a, c) => { a[c.status === 'online' ? 'online' : 'offline']++; return a; }, { online: 0, offline: 0 });
    
    [['online-count', counts.online], ['offline-count', counts.offline], ['total-count', list.length]].forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
});