/* frontend/dashboard/js/modules/data/clients.js */

let clients = {};

const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/** Инициализация списка */
export const updateClients = (list) => {
    clients = Object.fromEntries(list.map(c => [c.id, { ...c, status: 'offline', lastHB: 0 }]));
    emit('clientsUpdated');
};

/** Обновление конкретного клиента */
export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;

    const old = clients[data.id];
    // Бот онлайн, если это явный live-флаг, пакет без ключа БД или сетевой heartbeat
    const actuallyOnline = isLive || (data.pc_name && !data.auth_key) || data.net === 'heartbeat';

    clients[data.id] = {
        pc_name: 'Unknown', ip: '0.0.0.0', user: 'Unknown', // Defaults
        ...old,   // Состояние из памяти
        ...data,  // Новые данные
        status: actuallyOnline ? 'online' : (old?.status || 'offline'),
        lastHB: actuallyOnline ? Date.now() : (old?.lastHB || 0)
    };

    // Если бота не было в списке — обновляем всё, иначе только строку
    emit(old ? 'clientUpdated' : 'clientsUpdated', clients[data.id]);
};

/** Проверка таймаута (5 секунд) */
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

/** Геттер всех клиентов с сортировкой по IP */
export const getAllClients = () => {
    const toNum = ip => ip?.split('.').reduce((acc, octet) => (acc << 8) + (+octet), 0) >>> 0;
    return Object.values(clients).sort((a, b) => toNum(a.ip) - toNum(b.ip));
};