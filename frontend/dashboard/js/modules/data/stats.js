// frontend/dashboard/js/modules/data/stats.js
import { getAllClients } from './clients.js';

// Обновление счетчиков статистики (online, offline, total) в шапке при изменении данных
window.addEventListener('clientsUpdated', () => {
    const list = getAllClients();
    const stats = list.reduce((acc, { status }) => {
        acc[status === 'online' ? 'online' : 'offline']++;
        return acc;
    }, { online: 0, offline: 0 });
    
    const counts = {
        'online-count': stats.online,
        'offline-count': stats.offline,
        'total-count': list.length
    };

    Object.entries(counts).forEach(([id, val]) => {
        const el = document.getElementById(id);
        el && (el.textContent = val);
    });
});