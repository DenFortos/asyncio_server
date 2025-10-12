// js/modules/render/table.js

/**
 * Рендерит список клиентов в виде строк в таблице (Table View).
 * @param {Array<Object>} clients - Массив объектов клиентов для отображения.
 */
export function renderTable(clients) {
  // === ВРЕМЕННЫЙ КРИТИЧЕСКИЙ ЛОГ ДЛЯ ДИАГНОСТИКИ ===
  console.log('--- RENDER TABLE ---');
  console.log('Clients count:', clients.length);
  if (clients.length > 0) {
      console.log('First client data:', clients[0]);
  }
  // ===============================================
  const tbody = document.querySelector('#clients-list');
  if (!tbody) return;
  
  // Очистка контейнера
  tbody.innerHTML = '';

  clients.forEach(client => {
    // Используем стандартизированные ключи: loc и pc_name
    const location = client.loc || 'N/A';
    const pcName = client.pc_name || 'N/A';
    
    // Добавляем класс, чтобы можно было стилизовать всю строку
    const statusClass = client.status === 'online' ? 'client-online' : 'client-offline';
    
    const row = document.createElement('tr');
    row.className = `client-row ${statusClass}`;
    row.setAttribute('data-client-id', client.id);
    
    row.innerHTML = `
      <td data-label="loc">
        <span class="status-indicator ${client.status === 'online' ? 'status-online' : 'status-offline'}"></span>
        ${location}
      </td>
      <td data-label="user">${client.user || 'N/A'}</td>
      <td data-label="pc-name">${pcName}</td>
      <td data-label="last active">${client.lastActive || 'N/A'}</td>
      <td data-label="ip">${client.ip || 'N/A'}</td>
      <td data-label="active window">${client.activeWindow || 'N/A'}</td>
      <td data-label="id">${client.id}</td>
    `;
    tbody.appendChild(row);
  });
}