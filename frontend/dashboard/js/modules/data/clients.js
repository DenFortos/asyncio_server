// frontend/dashboard/js/modules/data/clients.js

let clients = {};
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/** Инициализация из БД — по умолчанию все offline */
export const updateClients = (list) => {
    clients = Object.fromEntries(list.map(c => [c.id, {
        ...c,
        status: 'offline',
        lastHB: 0
    }]));
    emit('clientsUpdated');
};

/** Обновление клиента. isLive=true для heartbeat (пульса) */
export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;

    const old = clients[data.id];
    clients[data.id] = {
        ...old,
        ...data,
        status: isLive ? 'online' : (old?.status || 'offline'),
        lastHB: isLive ? Date.now() : (old?.lastHB || 0)
    };

    emit(old ? 'clientUpdated' : 'clientsUpdated', clients[data.id]);
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

/** Удаление клиента */
export const removeClient = (id) => {
    if (clients[id]) {
        delete clients[id];
        emit('clientsUpdated');
    }
};

/** Получение всех клиентов с сортировкой по IP */
export const getAllClients = () => {
    const toNum = ip => ip?.split('.').reduce((acc, octet) => (acc << 8) + (+octet), 0) >>> 0;
    return Object.values(clients).sort((a, b) => toNum(a.ip) - toNum(b.ip));
};