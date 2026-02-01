let clients = {};

// Генерирует событие обновления для UI
const notify = (name, detail = null) => window.dispatchEvent(new CustomEvent(name, { detail }));

/** Обновляет весь список (ClientList) */
export function updateClients(list) {
    clients = Object.fromEntries(list.map(c => [c.id, c]));
    notify('clientsUpdated');
}

/** Добавляет/Обновляет одного клиента (DataScribe / AuthUpdate) */
export function updateClient(data) {
    if (!data?.id) return;
    clients[data.id] = { ...clients[data.id], ...data };
    notify('clientUpdated', data);
}

/** Удаляет клиента */
export function removeClient(id) {
    if (clients[id] && delete clients[id]) notify('clientRemoved', id);
}

/** Возвращает массив клиентов, отсортированный по активности (новые сверху) */
export function getAllClients() {
    return Object.values(clients).sort((a, b) => 
        (b.last_active || "").localeCompare(a.last_active || "")
    );
}

export const getClientById = (id) => clients[id];