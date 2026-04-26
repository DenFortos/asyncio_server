// frontend/dashboard/js/modules/data/stats.js
import { getAllClients } from './clients.js';

/**
 * Подписка на обновление данных для пересчета счетчиков в Header
 */
window.addEventListener('clientsUpdated', () => {
    const list = getAllClients();
    
    // Считаем количество по статусам
    const stats = list.reduce((acc, { status }) => {
        if (status === 'online') {
            acc.online++;
        } else {
            acc.offline++;
        }
        return acc;
    }, { online: 0, offline: 0 });
    
    // Маппинг ID элементов из HTML на значения
    const counts = {
        'online-count': stats.online,
        'offline-count': stats.offline,
        'total-count': list.length
    };

    // Обновляем текст в DOM
    Object.entries(counts).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = val;
        }
    });
});