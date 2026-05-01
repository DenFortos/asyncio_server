// frontend/dashboard/js/modules/data/stats.js

/** Пересчет и отображение статистики онлайн/оффлайн **/
import { getAllClients } from './clients.js';

const $ = id => document.getElementById(id);

window.addEventListener('clientsUpdated', () => {
    const clients = getAllClients();
    const stats = clients.reduce((acc, c) => {
        acc[c.status === 'online' ? 'on' : 'off']++;
        return acc;
    }, { on: 0, off: 0 });

    const update = (id, val) => $(id) && ($(id).textContent = val);

    update('online-count', stats.on);
    update('offline-count', stats.off);
    update('total-count', clients.length);
});