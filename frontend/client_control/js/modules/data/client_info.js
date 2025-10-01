// Файл: client_info.js
// Описание: Загрузка и отображение информации о клиенте (ID, IP, статус и т.д.)
// Используется для отображения данных клиента в заголовке

// Данные клиента (для демонстрации)
const clientData = {
  id: 'cl_123456789012345',
  location: 'US',
  user: 'user1',
  pc: 'PC-001',
  lastActive: '2 min ago',
  ip: '192.168.1.10',
  activeWindow: 'Chrome',
  status: 'online',
  screenshot: 'images/pc1.jpg'
};

// Инициализация данных клиента
function initClientData() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId') || clientData.id;

  document.getElementById('clientId').textContent = clientId;
  document.getElementById('clientIp').textContent = clientData.ip;
  document.getElementById('clientStatus').textContent = clientData.status;
  document.getElementById('clientStatus').className = `value status-${clientData.status}`;
}

// Экспортируем функцию в глобальный объект
window.initClientData = initClientData;