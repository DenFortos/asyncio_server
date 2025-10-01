// WebSocket-соединение
let ws;
let reconnectInterval = 5000; // 5 секунд

// Тестовые данные
const testClients = [
  { id: 'Client_001', status: 'online', location: 'RU', user: 'admin', pcName: 'PC-001', lastActive: '2025-04-01 10:30:00', ip: '192.168.1.100', activeWindow: 'Chrome.exe' },
  { id: 'Client_002', status: 'offline', location: 'US', user: 'user2', pcName: 'PC-002', lastActive: '2025-04-01 09:15:00', ip: '10.0.0.10', activeWindow: 'Explorer.exe' },
  { id: 'Client_003', status: 'online', location: 'DE', user: 'user3', pcName: 'PC-003', lastActive: '2025-04-01 11:45:00', ip: '172.16.0.5', activeWindow: 'VSCode.exe' },
  { id: 'Client_004', status: 'online', location: 'GB', user: 'user4', pcName: 'PC-004', lastActive: '2025-04-01 12:00:00', ip: '192.168.1.200', activeWindow: 'Discord.exe' },
  { id: 'Client_005', status: 'offline', location: 'FR', user: 'user5', pcName: 'PC-005', lastActive: '2025-04-01 08:30:00', ip: '10.10.10.10', activeWindow: 'Word.exe' },
  { id: 'Client_006', status: 'online', location: 'JP', user: 'user6', pcName: 'PC-006', lastActive: '2025-04-01 13:20:00', ip: '192.168.2.100', activeWindow: 'Photoshop.exe' },
  { id: 'Client_007', status: 'online', location: 'CN', user: 'user7', pcName: 'PC-007', lastActive: '2025-04-01 14:10:00', ip: '10.0.1.50', activeWindow: 'Excel.exe' },
  { id: 'Client_008', status: 'offline', location: 'BR', user: 'user8', pcName: 'PC-008', lastActive: '2025-04-01 07:45:00', ip: '172.16.1.20', activeWindow: 'PowerPoint.exe' },
  { id: 'Client_009', status: 'online', location: 'AU', user: 'user9', pcName: 'PC-009', lastActive: '2025-04-01 15:30:00', ip: '192.168.3.50', activeWindow: 'Teams.exe' },
  { id: 'Client_010', status: 'online', location: 'CA', user: 'user10', pcName: 'PC-010', lastActive: '2025-04-01 16:00:00', ip: '10.1.1.100', activeWindow: 'Slack.exe' },
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
    const data = JSON.parse(event.data);
    if (data.type === 'clientsUpdate') {
      window.clients = data.clients;
      // Обновляем таблицу/сетку
      if (window.renderClients) {
        window.renderClients(window.clients);
      }
      if (window.updateStats) {
        window.updateStats();
      }
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected. Reconnecting...');
    setTimeout(connectWebSocket, reconnectInterval);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  window.clients = testClients; // Начальные тестовые данные
  connectWebSocket();
});