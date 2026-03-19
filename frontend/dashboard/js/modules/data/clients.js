/* frontend/dashboard/js/modules/data/clients.js */

let clients = {};
const emit = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const updateClients = (list) => {
    let hasChanges = false;
    list.forEach(c => {
        if (!clients[c.id]) {
            clients[c.id] = { ...c, status: 'offline', lastHB: 0, lastPreview: null };
            hasChanges = true;
        }
    });
    if (hasChanges) emit('clientsUpdated');
};

export const updateClient = (data, isLive = false) => {
    if (!data?.id) return;
    const old = clients[data.id];
    if (!old && !isLive) return;

    const newStatus = isLive ? 'online' : (old?.status || 'offline');
    const newHB = isLive ? Date.now() : (old?.lastHB || 0);

    clients[data.id] = {
        pc_name: 'Unknown', ip: '0.0.0.0', user: 'Unknown',
        ...old, ...data,
        status: newStatus,
        lastHB: newHB
    };

    if (!old || old.status !== newStatus) {
        emit('clientsUpdated');
    } else {
        emit('clientUpdated', clients[data.id]);
    }
};

export const setClientPreview = (id, url) => {
    if (!clients[id]) return;
    if (clients[id].lastPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(clients[id].lastPreview);
    }
    clients[id].lastPreview = url;
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

export const removeClient = (id) => {
    if (clients[id]) {
        if (clients[id].lastPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(clients[id].lastPreview);
        }
        delete clients[id];
        emit('clientRemoved');
    }
};