// js/modules/data/clients.js

// Глобальное хранилище клиентов: ключ - ID клиента, значение - объект клиента
let clients = {};

// ----------------------------------------------------------------------
// МУТАТОРЫ (Изменение состояния)
// ----------------------------------------------------------------------

/**
 * Обновляет список клиентов (ClientList при старте).
 */
export function updateClients(newClients) {
    clients = {};
    newClients.forEach(client => {
        clients[client.id] = client;
    });

    console.log(`[DataStore] Сверхсинхронизация: ${Object.keys(clients).length} клиентов.`);

    // Генерируем стандартное событие для dashboard.js
    window.dispatchEvent(new CustomEvent('clientsUpdated'));
}

/**
 * Добавляет или обновляет клиента (DataScribe / AuthUpdate).
 */
export function updateClient(clientData) {
    if (!clientData || !clientData.id) return;

    const clientId = clientData.id;

    // МЕРДЖ ДАННЫХ: Важно сохранить старые поля (LOC, IP), если DataScribe прислал только Window
    clients[clientId] = {
        ...(clients[clientId] || {}),
        ...clientData
    };

    console.log(`[DataStore] Обновлен клиент: ${clientId}, Окно: ${clientData.activeWindow || 'не изменилось'}`);

    // ВАЖНО: dashboard.js ожидает события 'clientUpdated' или 'clientsUpdated' для вызова updateView
    // Мы вызываем оба для надежности, чтобы сработал рендер
    window.dispatchEvent(new CustomEvent('clientUpdated', { detail: clientData }));
}

/**
 * Удаляет клиента.
 */
export function removeClient(clientId) {
    if (clients[clientId]) {
        delete clients[clientId];
        window.dispatchEvent(new CustomEvent('clientRemoved', { detail: clientId }));
    }
}

// ----------------------------------------------------------------------
// ГЕТТЕРЫ (Получение состояния)
// ----------------------------------------------------------------------

/**
 * Возвращает отсортированный массив клиентов.
 */
export function getAllClients() {
    return Object.values(clients).sort((a, b) => {
        // Улучшенная сортировка для формата HH:MM:SS или YYYY-MM-DD HH:MM:SS
        const parseTime = (timeStr) => {
            if (!timeStr) return 0;
            // Если это просто HH:MM:SS, добавляем сегодняшнюю дату, чтобы Date.parse сработал
            if (timeStr.includes(':') && !timeStr.includes('-')) {
                const today = new Date().toISOString().split('T')[0];
                return Date.parse(`${today} ${timeStr}`);
            }
            return Date.parse(timeStr) || 0;
        };

        const aDate = parseTime(a.last_active);
        const bDate = parseTime(b.last_active);

        return bDate - aDate; // Новые сверху
    });
}

export function getClientById(clientId) {
    return clients[clientId];
}