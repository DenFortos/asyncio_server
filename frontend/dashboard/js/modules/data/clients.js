/**
 * Модуль для управления данными клиентов.
 * Использует объект (словарь) для быстрого доступа по ID.
 * Оповещает приложение через CustomEvent при изменениях.
 */

// Изначально пустой словарь клиентов (id -> client)
let clients = {};

/**
 * Обновляет полный список клиентов. Используется при полной синхронизации.
 * @param {Array<Object>} newClientsArray - Новый массив объектов клиентов.
 */
export function updateClients(newClientsArray) {
  // Преобразуем массив в словарь
  clients = newClientsArray.reduce((acc, client) => {
    // Внимание: Проверяем наличие 'id'
    if (client.id) {
      acc[client.id] = client;
    }
    return acc;
  }, {});

  // Оповещаем другие модули об изменении данных
  window.dispatchEvent(new CustomEvent('clientsUpdated', { detail: Object.values(clients) }));
}

/**
 * Получает всех клиентов (в виде массива).
 * @returns {Array<Object>} Массив объектов клиентов.
 */
export function getAllClients() {
  return Object.values(clients);
}

/**
 * Получает клиента по ID.
 * @param {string} id - ID клиента.
 * @returns {Object|null} Объект клиента или null, если не найден.
 */
export function getClientById(id) {
  return clients[id] || null;
}

/**
 * Добавляет или обновляет данные одного клиента.
 * Используется для динамических обновлений (статус, активное окно, скриншот).
 * @param {Object} clientData - Объект с данными клиента, обязательно содержащий 'id'.
 */
export function updateClient(clientData) {
  if (!clientData || !clientData.id) return;

  // Частичное обновление: объединяем старые и новые данные
  // Если клиента нет, создаем новый объект на основе clientData
  clients[clientData.id] = {
    ...(clients[clientData.id] || {}),
    ...clientData
  };

  // Оповещаем об изменении
  window.dispatchEvent(new CustomEvent('clientUpdated', { detail: clients[clientData.id] }));
}

/**
 * Удаляет клиента по ID.
 * @param {string} id - ID клиента.
 */
export function removeClient(id) {
  if (clients[id]) {
    delete clients[id];

    // Оповещаем об удалении
    window.dispatchEvent(new CustomEvent('clientRemoved', { detail: id }));
  }
}

// ----------------------------------------------------------------------
// УДАЛЕНО: Статические заглушки mockClients и их вызов.
// Данные теперь должны приходить исключительно через WebSocket.
// ----------------------------------------------------------------------