/* frontend/dashboard/js/modules/data/stats.js

/* ==========================================================================
   1. ИМПОРТЫ (Dependencies)
   ========================================================================== */

import { getAllClients } from './clients.js';

/* ==========================================================================
   2. РАСЧЕТ И ОТРИСОВКА (Calc & Render)
========================================================================== */

/** Обновляет счетчики Online, Offline, Total в HTML */
export const updateStats = () => {
    const clients = getAllClients();

    // Считаем количество статусов за один проход цикла
    const stats = clients.reduce((acc, { status }) => {
        acc[status === 'online' ? 'online' : 'offline']++;
        return acc;
    }, { online: 0, offline: 0 });

    const uiMap = {
        'online-count': stats.online,
        'offline-count': stats.offline,
        'total-count': clients.length
    };

    // Обновляем текст в элементах, только если число реально изменилось
    Object.entries(uiMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(val)) {
            el.textContent = val;
        }
    });
};

/* ==========================================================================
   3. ПОДПИСКИ (Event Subscriptions)
========================================================================== */

// Автоматический запуск пересчета при любых изменениях в данных
['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(event =>
    window.addEventListener(event, updateStats)
);