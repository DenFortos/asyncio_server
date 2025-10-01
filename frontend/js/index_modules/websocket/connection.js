// WebSocket подключение и обработчики (заготовка)
document.addEventListener('DOMContentLoaded', () => {
  let ws = null;

  function initWebSocket() {
    ws = new WebSocket('ws://localhost:8080');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'client_update') {
        window.clients = data.clients;
        window.renderClients(window.clients);
        window.updateStats();
      }
    };

    ws.onclose = () => {
      setTimeout(initWebSocket, 5000); // Переподключаемся
    };
  }

  initWebSocket(); // Добавляем WebSocket
});