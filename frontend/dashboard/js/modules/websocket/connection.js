// js/modules/websocket/connection.js

import { updateClients } from '../data/clients.js';

let ws;
let reconnectInterval = 5000; // 5 секунд

// ----------------------------------------------------------------------
// Заглушка для тестовых данных (Исправленные ключи)
// ----------------------------------------------------------------------

const testClients = [
  { id: 'Client_001', status: 'online', loc: 'RU', user: 'admin', pc_name: 'PC-001', lastActive: '2025-04-01 10:30:00', ip: '192.168.1.100', activeWindow: 'Chrome.exe' },
  { id: 'Client_002', status: 'offline', loc: 'US', user: 'user2', pc_name: 'PC-002', lastActive: '2025-04-01 09:15:00', ip: '10.0.0.10', activeWindow: 'Explorer.exe' },
  { id: 'Client_003', status: 'online', loc: 'DE', user: 'user3', pc_name: 'PC-003', lastActive: '2025-04-01 11:45:00', ip: '172.16.0.5', activeWindow: 'VSCode.exe' },
  { id: 'Client_004', status: 'online', loc: 'GB', user: 'user4', pc_name: 'PC-004', lastActive: '2025-04-01 12:00:00', ip: '192.168.1.200', activeWindow: 'Discord.exe' },
  { id: 'Client_005', status: 'offline', loc: 'FR', user: 'user5', pc_name: 'PC-005', lastActive: '2025-04-01 08:30:00', ip: '10.10.10.10', activeWindow: 'Word.exe' },
  { id: 'Client_006', status: 'online', loc: 'JP', user: 'user6', pc_name: 'PC-006', lastActive: '2025-04-01 13:20:00', ip: '192.168.2.100', activeWindow: 'Photoshop.exe' },
  { id: 'Client_007', status: 'online', loc: 'CN', user: 'user7', pc_name: 'PC-007', lastActive: '2025-04-01 14:10:00', ip: '10.0.1.50', activeWindow: 'Excel.exe' },
  { id: 'Client_008', status: 'offline', loc: 'BR', user: 'user8', pc_name: 'PC-008', lastActive: '2025-04-01 07:45:00', ip: '172.16.1.20', activeWindow: 'PowerPoint.exe' },
  { id: 'Client_009', status: 'online', loc: 'AU', user: 'user9', pc_name: 'PC-009', lastActive: '2025-04-01 15:30:00', ip: '192.168.3.50', activeWindow: 'Teams.exe' },
  { id: 'Client_010', status: 'online', loc: 'CA', user: 'user10', pc_name: 'PC-010', lastActive: '2025-04-01 16:00:00', ip: '10.1.1.100', activeWindow: 'Slack.exe' },
];


function connectWebSocket() {
  const wsUrl = 'ws://localhost:8080/ws'; // Заглушка
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    // Отправляем запрос на получение клиентов
    ws.send(JSON.stringify({ type: 'getClients' }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'clientsUpdate' && Array.isArray(data.clients)) {
        // 🚨 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Используем updateClients из модуля clients.js
        // clients.js обновит данные и автоматически отправит событие 'clientsUpdated',
        // на которое уже подписаны dashboard.js и stats.js.
        updateClients(data.clients);
      }
      // Здесь можно добавить обработку других типов сообщений (clientUpdate, clientRemoved, alert, etc.)

    } catch (e) {
      console.error('Error parsing WebSocket message:', e, event.data);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected. Reconnecting...');
    // Можно добавить логику для уведомления пользователя через AlertsManager
    setTimeout(connectWebSocket, reconnectInterval);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Можно добавить логику для уведомления пользователя
  };
}

// ----------------------------------------------------------------------
// Инициализация
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // 🚨 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Загружаем тестовые данные через updateClients
  // Это гарантирует, что данные будут обработаны и событие 'clientsUpdated' будет отправлено.
  updateClients(testClients);

  connectWebSocket();
});

// Экспортируем функцию, если она нужна другим модулям для отправки команд
export { connectWebSocket, ws };