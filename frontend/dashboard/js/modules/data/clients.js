// clients.js

// Изначально пустой словарь клиентов (id -> client)
let clients = {};

// Функция для обновления данных клиентов (будет вызываться из WebSocket)
function updateClients(newClientsArray) {
  // Преобразуем массив в словарь
  clients = newClientsArray.reduce((acc, client) => {
    acc[client.id] = client;
    return acc;
  }, {});

  // Оповещаем другие модули об изменении данных
  window.dispatchEvent(new CustomEvent('clientsUpdated', { detail: Object.values(clients) }));
}

// Функция для получения всех клиентов (в виде массива)
function getAllClients() {
  return Object.values(clients);
}

// Функция для получения клиента по ID
function getClientById(id) {
  return clients[id] || null;
}

// Функция для добавления/обновления одного клиента
function updateClient(clientData) {
  if (clientData.id) {
    clients[clientData.id] = { ...clients[clientData.id], ...clientData };
    // Оповещаем об изменении
    window.dispatchEvent(new CustomEvent('clientUpdated', { detail: clientData }));
  }
}

// Функция для удаления клиента
function removeClient(id) {
  if (clients[id]) {
    delete clients[id];
    // Оповещаем об удалении
    window.dispatchEvent(new CustomEvent('clientRemoved', { detail: id }));
  }
}

// Экспортируем функции в глобальный объект window
window.clientsData = {
  updateClients,
  getAllClients,
  getClientById,
  updateClient,
  removeClient
};

// Заглушка для тестирования (временно)
const mockClients = [
  { id: 'cl_123456789012345', location: 'US', user: 'user1', pc: 'PC-001', lastActive: '2 min ago', ip: '192.168.1.10', activeWindow: 'Chrome', status: 'online', screenshot: 'images/pc1.jpg' },
  { id: 'cl_234567890123456', location: 'DE', user: 'user2', pc: 'PC-002', lastActive: '5 min ago', ip: '10.0.0.5', activeWindow: 'VSCode', status: 'offline', screenshot: 'images/pc2.jpg' },
  { id: 'cl_345678901234567', location: 'RU', user: 'user3', pc: 'PC-003', lastActive: '1 min ago', ip: '172.16.0.12', activeWindow: 'Discord', status: 'online', screenshot: 'images/pc3.jpg' },
  { id: 'cl_456789012345678', location: 'GB', user: 'user4', pc: 'PC-004', lastActive: '3 min ago', ip: '192.168.1.20', activeWindow: 'Edge', status: 'online', screenshot: 'images/pc1.jpg' },
  { id: 'cl_567890123456789', location: 'FR', user: 'user5', pc: 'PC-005', lastActive: '10 min ago', ip: '10.0.0.15', activeWindow: 'Notepad', status: 'offline', screenshot: 'images/pc2.jpg' },
  { id: 'cl_678901234567890', location: 'JP', user: 'user6', pc: 'PC-006', lastActive: '1 hour ago', ip: '172.16.1.10', activeWindow: 'Terminal', status: 'online', screenshot: 'images/pc3.jpg' },
  { id: 'cl_789012345678901', location: 'CA', user: 'user7', pc: 'PC-007', lastActive: '2 hours ago', ip: '192.168.1.30', activeWindow: 'VSCode', status: 'offline', screenshot: 'images/pc1.jpg' },
  { id: 'cl_890123456789012', location: 'AU', user: 'user8', pc: 'PC-008', lastActive: 'Just now', ip: '10.0.0.25', activeWindow: 'Firefox', status: 'online', screenshot: 'images/pc2.jpg' },
  { id: 'cl_901234567890123', location: 'BR', user: 'user9', pc: 'PC-009', lastActive: '5 min ago', ip: '172.16.0.20', activeWindow: 'Teams', status: 'online', screenshot: 'images/pc3.jpg' },
  { id: 'cl_012345678901234', location: 'IN', user: 'user10', pc: 'PC-010', lastActive: '30 min ago', ip: '192.168.1.40', activeWindow: 'Explorer', status: 'offline', screenshot: 'images/pc1.jpg' }
];

// Обновляем данные при загрузке (для тестирования)
window.clientsData.updateClients(mockClients);