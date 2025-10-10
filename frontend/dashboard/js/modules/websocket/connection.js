import { updateClient } from '../data/clients.js';

// Используем window.alertsManager, так как он инициализируется в dashboard.js
const alertsManager = window.alertsManager;

let ws;
let reconnectInterval = 5000;      // 5 секунд для попытки переподключения
let pendingBinaryHeader = null;    // Хранение заголовка в ожидании бинарного фрейма

let pingIntervalId = null;         // ID интервала для PING
const PING_INTERVAL = 25000;       // Отправляем PING каждые 25 секунд для Heartbeat

/**
 * Инициирует подключение WebSocket к API-серверу.
 */
function connectWebSocket() {

  // 1. Очистка предыдущего PING-интервала, если он есть
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  // --- ИЗМЕНЕНИЕ: Используем document.location.host, который включает порт 8001
  const wsUrl = `ws://${document.location.host}/ws/feed`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Вывод лога теперь более универсален
    console.log(`✅ WebSocket connected to API feed at ${document.location.host}. Starting PING.`);

    // 2. Запуск логики PING (Heartbeat)
    pingIntervalId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            // Отправляем простое сообщение для поддержания соединения в живом состоянии
            ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        }
    }, PING_INTERVAL);
  };

  ws.onmessage = (event) => {

    // 1. Обработка ТЕКСТОВЫХ (JSON) сообщений (Статусы, Шапки, Результаты)
    if (typeof event.data === 'string') {
        try {
            const data = JSON.parse(event.data);
            const clientId = data.client_id || (data.data ? data.data.id : null);

            // Игнорируем ответ PONG, если он есть
            if (data.type === 'pong' || data.type === 'ping') return;

            // === A) ОБРАБОТКА СТАТУСА (AuthUpdate) ===
            if (data.module === 'AuthUpdate') {
                const clientData = data.data;
                console.log(`✅ Client Status: ${clientData.id} is ${clientData.status}`);
                updateClient(clientData);

            }
            // === B) ОБРАБОТКА JSON-РЕЗУЛЬТАТОВ ВОБКЕРОВ ===
            else if (data.type === 'json') {
                console.log(`[${data.module}] JSON Data for ${clientId}:`, data.data);

                if (alertsManager) {
                    alertsManager.addAlert({
                        type: 'info',
                        message: `[${data.module}] New data from client ${clientId}`,
                        details: JSON.stringify(data.data)
                    });
                }
            }
            // === C) ОБРАБОТКА ШАПКИ ДЛЯ БИНАРНЫХ ДАННЫХ ===
            else if (data.type === 'binary' && clientId) {
                pendingBinaryHeader = data;
                console.log(`[${data.module}] Awaiting binary payload for ${clientId}...`);
            }

        } catch (e) {
            console.error('Error parsing WebSocket message:', e, event.data);
        }
    }

    // 2. Обработка БИНАРНЫХ сообщений (Скриншоты, Файлы)
    else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {

        if (pendingBinaryHeader) {
            const header = pendingBinaryHeader;
            const blob = event.data instanceof Blob ? event.data : new Blob([event.data]);

            console.log(`[${header.module}] Received ${blob.size} bytes for ${header.client_id}.`);

            // === ДИСПЕТЧЕРИЗАЦИЯ БИНАРНЫХ ДАННЫХ ===

            // Сброс заголовка
            pendingBinaryHeader = null;

        } else {
            console.warn('Received binary data without a preceding JSON header. Ignoring.');
        }
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected. Attempting to reconnect in 5 seconds...');

    // 3. Очистка PING при закрытии
    if (pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
    }

    setTimeout(connectWebSocket, reconnectInterval);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error occurred:', error);
  };
}

// ----------------------------------------------------------------------
// Инициализация
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();
});

/**
 * Отправляет команду бэкенду через WebSocket.
 * @param {Object} message - Объект сообщения для отправки.
 */
function sendCommand(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
    }
    console.warn('WebSocket is not open. Command not sent:', message);
    return false;
}

// Экспорт
export { connectWebSocket, ws, sendCommand };