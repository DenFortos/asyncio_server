// Функция рендера таблицы (все клиенты)
function renderTable(data) {
  const clientsList = document.getElementById('clients-list');
  clientsList.innerHTML = '';

  data.forEach(client => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.location}</td>
      <td><span class="status-indicator status-${client.status}"></span>${client.user}</td>
      <td>${client.pc}</td>
      <td>${client.lastActive}</td>
      <td>${client.ip}</td>
      <td>${client.activeWindow}</td>
      <td>${client.id}</td>
    `;
    row.onclick = () => {
      window.location.href = `client_control.html?clientId=${client.id}`;
    };
    clientsList.appendChild(row);
  });
}

// Экспортируем всё в глобальный объект window
window.renderTable = renderTable;