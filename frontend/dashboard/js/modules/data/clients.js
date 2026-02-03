// js/modules/data/clients.js

let clients = {};
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/** Инициализация из БД — все строго offline */
export const updateClients = (list) => {
    clients = Object.fromEntries(list.map(c => [c.id, {
        ...c,
        status: 'offline',
        lastHB: 0
    }]));
    emit('clientsUpdated');
};

/** Обновление клиента. isLive=true только для heartbeat пакетов */
export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;
    const old = clients[data.id] || {};

    clients[data.id] = {
        ...old,
        ...data,
        // Если это пульс — включаем online. Если инфа из БД — сохраняем текущий.
        status: isLive ? 'online' : (old.status || 'offline'),
        lastHB: isLive ? Date.now() : (old.lastHB || 0)
    };

    emit(old.id ? 'clientUpdated' : 'clientsUpdated', clients[data.id]);
};

/** Проверка таймаута (5 сек) */
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

export const removeClient = (id) => clients[id] && delete clients[id] && emit('clientRemoved', id);

export const getAllClients = () => {
    const toNum = ip => (ip || "255.255.255.255").split('.').reduce((a, o) => (a << 8) + (+o), 0) >>> 0;
    return Object.values(clients).sort((a, b) => toNum(a.ip) - toNum(b.ip));
};