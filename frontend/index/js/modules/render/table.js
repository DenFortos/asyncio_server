window.renderTable = (clients) => {
  const tbody = document.querySelector('#clients-list');
  tbody.innerHTML = '';

  clients.forEach(client => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <span class="status-indicator ${client.status === 'online' ? 'status-online' : 'status-offline'}"></span>
        ${client.location || 'N/A'}
      </td>
      <td>${client.user || 'N/A'}</td>
      <td>${client.pcName || 'N/A'}</td>
      <td>${client.lastActive || 'N/A'}</td>
      <td>${client.ip || 'N/A'}</td>
      <td>${client.activeWindow || 'N/A'}</td>
      <td>${client.id}</td>
    `;
    tbody.appendChild(row);
  });
};