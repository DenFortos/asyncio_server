/* frontend/dashboard/js/modules/data/clients.js */
let clients = {};
const emit = () => window.dispatchEvent(new CustomEvent('clientsUpdated'));

export const updateClients = (list) => {
    list.forEach(c => clients[c.id] = { ...c, lastPreview: clients[c.id]?.lastPreview || null });
    emit();
};

export const updateClient = (data) => {
    if (!data?.id || (!clients[data.id] && !data.pc_name)) return;
    clients[data.id] = { ...clients[data.id], ...data };
    emit();
};

export const setClientPreview = (id, url) => {
    const c = clients[id];
    if (!c) return;
    if (c.lastPreview?.startsWith('blob:')) URL.revokeObjectURL(c.lastPreview);
    c.lastPreview = url;
};

export const getAllClients = () => Object.values(clients).sort((a, b) => 
    (b.status === 'online') - (a.status === 'online') || a.id.localeCompare(b.id)
);