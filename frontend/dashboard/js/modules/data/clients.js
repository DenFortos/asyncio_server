// js/modules/data/clients.js

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

/** * Возвращает массив клиентов, отсортированный по IP (от меньшего к большему).
 * Если IP нет (N/A), такие клиенты уходят в конец списка.
 */
export function getAllClients() {
    return Object.values(clients).sort((a, b) => {
        const ipA = a.ip || "255.255.255.255";
        const ipB = b.ip || "255.255.255.255";

        const numA = ipA.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
        const numB = ipB.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

        return numA - numB;
    });
}