/* frontend/dashboard/js/modules/data/clients.js */

/* ==========================================================================
   1. ХРАНИЛИЩЕ И СОБЫТИЯ (Storage & Events)
========================================================================== */

let clients = {};

const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/* ==========================================================================
   2. ОБНОВЛЕНИЕ ДАННЫХ (Data Updates)
========================================================================== */

export const updateClients = (list) => {
    clients = Object.fromEntries(list.map(c => [c.id, { ...c, status: 'offline', lastHB: 0 }]));
    emit('clientsUpdated');
};

export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;

    const old = clients[data.id];
    const actuallyOnline = isLive || (data.pc_name && !data.auth_key) || data.net === 'heartbeat';

    clients[data.id] = {
        pc_name: 'Unknown', ip: '0.0.0.0', user: 'Unknown',
        ...old,
        ...data,
        status: actuallyOnline ? 'online' : (old?.status || 'offline'),
        lastHB: actuallyOnline ? Date.now() : (old?.lastHB || 0)
    };

    emit(old ? 'clientUpdated' : 'clientsUpdated', clients[data.id]);
};

/* ==========================================================================
   3. МОНИТОРИНГ СОСТОЯНИЯ (Watchdog / Timeout)
========================================================================== */

export const checkDeadClients = () => {
    const now = Date.now();
    let changed = false;

    Object.values(clients).forEach(c => {
        if (c.status === 'online' && (now - c.lastHB) > 5000) {
            c.status = 'offline';
            changed = true;
        }
    });

    if (changed) emit('clientsUpdated');
};

/* ==========================================================================
   4. ВЫБОРКА И СОРТИРОВКА (Getters)
========================================================================== */

export const getAllClients = () => {
    const toNum = ip => ip?.split('.').reduce((acc, octet) => (acc << 8) + (+octet), 0) >>> 0;
    return Object.values(clients).sort((a, b) => toNum(a.ip) - toNum(b.ip));
};