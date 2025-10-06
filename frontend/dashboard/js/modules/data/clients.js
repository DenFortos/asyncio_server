// js/modules/data/clients.js

/**
 * Модуль для управления данными клиентов.
 * Использует объект (словарь) для быстрого доступа по ID.
 * Оповещает приложение через CustomEvent при изменениях.
 */

// Изначально пустой словарь клиентов (id -> client)
let clients = {};

/**
 * Обновляет полный список клиентов.
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
 * @param {Object} clientData - Объект с данными клиента, обязательно содержащий 'id'.
 */
export function updateClient(clientData) {
  if (clientData.id) {
    // Частичное обновление: объединяем старые и новые данные
    clients[clientData.id] = { ...clients[clientData.id], ...clientData };

    // Оповещаем об изменении
    window.dispatchEvent(new CustomEvent('clientUpdated', { detail: clients[clientData.id] }));
  }
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
// Заглушка для тестирования (Используем стандартизированные имена ключей: loc, pc_name)
// ----------------------------------------------------------------------

const mockClients = [
  { id: 'cl_123456789012345', loc: 'US', user: 'user1', pc_name: 'PC-001', lastActive: '2 min ago', ip: '192.168.1.10', activeWindow: 'Chrome', status: 'online', screenshot: 'images/pc1.jpg' },
  { id: 'cl_234567890123456', loc: 'DE', user: 'user2', pc_name: 'PC-002', lastActive: '5 min ago', ip: '10.0.0.5', activeWindow: 'VSCode', status: 'offline', screenshot: 'images/pc2.jpg' },
  { id: 'cl_345678901234567', loc: 'RU', user: 'user3', pc_name: 'PC-003', lastActive: '1 min ago', ip: '172.16.0.12', activeWindow: 'Discord', status: 'online', screenshot: 'images/pc3.jpg' },
  { id: 'cl_456789012345678', loc: 'GB', user: 'user4', pc_name: 'PC-004', lastActive: '3 min ago', ip: '192.168.1.20', activeWindow: 'Edge', status: 'online', screenshot: 'images/pc1.jpg' },
  { id: 'cl_567890123456789', loc: 'FR', user: 'user5', pc_name: 'PC-005', lastActive: '10 min ago', ip: '10.0.0.15', activeWindow: 'Notepad', status: 'offline', screenshot: 'images/pc2.jpg' },
  { id: 'cl_678901234567890', loc: 'JP', user: 'user6', pc_name: 'PC-006', lastActive: '1 hour ago', ip: '172.16.1.10', activeWindow: 'Terminal', status: 'online', screenshot: 'images/pc3.jpg' },
  { id: 'cl_789012345678901', loc: 'CA', user: 'user7', pc_name: 'PC-007', lastActive: '2 hours ago', ip: '192.168.1.30', activeWindow: 'VSCode', status: 'offline', screenshot: 'images/pc1.jpg' },
  { id: 'cl_890123456789012', loc: 'AU', user: 'user8', pc_name: 'PC-008', lastActive: 'Just now', ip: '10.0.0.25', activeWindow: 'Firefox', status: 'online', screenshot: 'images/pc2.jpg' },
  { id: 'cl_901234567890123', loc: 'BR', user: 'user9', pc_name: 'PC-009', lastActive: '5 min ago', ip: '172.16.0.20', activeWindow: 'Teams', status: 'online', screenshot: 'images/pc3.jpg' },
  { id: 'cl_012345678901234', loc: 'IN', user: 'user10', pc_name: 'PC-010', lastActive: '30 min ago', ip: '192.168.1.40', activeWindow: 'Explorer', status: 'offline', screenshot: 'images/pc1.jpg' }
];

// Обновляем данные при загрузке (для тестирования)
updateClients(mockClients);