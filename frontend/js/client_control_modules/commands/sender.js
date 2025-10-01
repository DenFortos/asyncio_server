// Файл: sender.js
// Описание: Отправка команд клиенту через WebSocket
// Используется для отправки всех команд управления клиенту

// Функция отправки команды клиенту (через WebSocket или HTTP)
function sendCommandToClient(command, data = null) {
  // Здесь будет логика отправки команды конкретному клиенту
  // Например, через WebSocket:
  // ws.send(JSON.stringify({ command: command, data: data, clientId: clientId }));
  console.log(`Command to client: ${command}`, data);
}

// Экспортируем функцию в глобальный объект
window.sendCommandToClient = sendCommandToClient;