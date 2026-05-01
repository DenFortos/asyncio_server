// frontend/dashboard/js/modules/data/clients.js
let clients = {};

const emit = () => window.dispatchEvent(new CustomEvent('clientsUpdated'));

export const updateClients = (list) => {
    list.forEach(c => {
        if (!c.id) return;
        clients[c.id] = { ...clients[c.id], ...c };
    });
    emit();
};

export const updateClient = (data) => {
    if (!data?.id) return;
    // Сохраняем превью
    const prev = clients[data.id]?.lastPreview;
    clients[data.id] = { ...clients[data.id], ...data };
    if (prev) clients[data.id].lastPreview = prev;
    // Мы не вызываем emit() здесь, если работаем через Renderer.patch, 
    // чтобы не перерисовывать всю таблицу на каждый чих бота.
};

export const setClientPreview = (id, url) => {
    if (!clients[id]) clients[id] = { id, status: 'online' };
    if (clients[id].lastPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(clients[id].lastPreview);
    }
    clients[id].lastPreview = url;
};

export const getAllClients = () => Object.values(clients).sort((a, b) => 
    (b.status === 'online') - (a.status === 'online') || a.id.localeCompare(b.id)
);