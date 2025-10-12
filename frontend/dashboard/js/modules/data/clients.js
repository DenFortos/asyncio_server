// js/modules/data/clients.js

// Глобальное хранилище клиентов: ключ - ID клиента, значение - объект клиента
let clients = {};


// ----------------------------------------------------------------------
// МУТАТОРЫ (Изменение состояния)
// ----------------------------------------------------------------------

/**
 * Обновляет список клиентов, заменяя его новым массивом (Используется для ClientList при старте).
 * @param {Array<Object>} newClients - Новый массив объектов клиентов.
 */
export function updateClients(newClients) {
    // --- ДИАГНОСТИЧЕСКИЕ ЛОГИ ---
    console.log('--- DIAGNOSTICS: clients.js (updateClients) ---');
    console.log(`[updateClients] Received ${newClients.length} clients.`);

    clients = {}; // Очистка
    newClients.forEach(client => {
        clients[client.id] = client;
    });

    console.log(`[updateClients] Stored ${Object.keys(clients).length} clients in state.`);

    if (newClients.length > 0) {
        const firstClient = newClients[0];
        console.log(`[updateClients] First Client ID: ${firstClient.id}`);
        // Проверяем КРИТИЧЕСКОЕ поле
        console.log(`[updateClients] First Client last_active: ${firstClient.last_active}`);
    }
    console.log('------------------------------------------------');
    // --- КОНЕЦ ДИАГНОСТИЧЕСКИХ ЛОГОВ ---

    window.dispatchEvent(new CustomEvent('clientsUpdated'));
}


/**
 * Добавляет нового клиента или обновляет существующего (Используется для AuthUpdate/текущих обновлений).
 * @param {Object} clientData - Объект данных клиента.
 */
export function updateClient(clientData) {
    if (!clientData || !clientData.id) {
        console.warn('Attempted to update client without valid ID or data.', clientData);
        return;
    }

    const clientId = clientData.id;
    let eventName = 'clientUpdated';

    if (!clients[clientId]) {
         console.log(`[updateClient] New client connected/updated: ${clientId}.`);
    }

    // Обновляем данные: сохраняем старые и перезаписываем новыми
    clients[clientId] = {
        ...(clients[clientId] || {}),
        ...clientData
    };

    window.dispatchEvent(new CustomEvent(eventName, { detail: clientId }));
}

/**
 * Удаляет клиента из хранилища (Используется при отключении).
 * @param {string} clientId - ID клиента для удаления.
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
 * Возвращает массив всех клиентов, отсортированных по last_active (самый новый вверху).
 * @returns {Array<Object>} Массив объектов клиентов.
 */
export function getAllClients() {
    return Object.values(clients).sort((a, b) => {
        const aTime = a.last_active || '1970-01-01 00:00:00'; // Заглушка для отсутствующих полей
        const bTime = b.last_active || '1970-01-01 00:00:00';

        // 🚨 КОРРЕКЦИЯ: Преобразование строки времени в timestamp для надежной сортировки.
        // Используем Date.parse, который хорошо обрабатывает формат YYYY-MM-DD HH:MM:SS.
        const aDate = Date.parse(aTime);
        const bDate = Date.parse(bTime);

        // Сортировка по убыванию времени (самый свежий сверху)
        // Если Date.parse вернул NaN, используем 0.
        return (bDate || 0) - (aDate || 0);
    });
}

/**
 * Возвращает объект клиента по ID.
 * @param {string} clientId - ID клиента.
 * @returns {Object|undefined} Объект клиента или undefined.
 */
export function getClientById(clientId) {
    return clients[clientId];
}