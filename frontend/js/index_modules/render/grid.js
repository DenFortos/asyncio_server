// Функция рендера сетки (только онлайн клиенты с кадрами)
function renderGrid(data) {
  const gridView = document.getElementById('grid-view');
  gridView.innerHTML = '';

  // Фильтруем только онлайн клиентов
  const onlineClients = data.filter(client => client.status === 'online');

  onlineClients.forEach(client => {
    const card = document.createElement('div');
    card.className = 'client-card';
    // Используем HTTP для загрузки кадра
    card.innerHTML = `
      <div class="preview-container">
        <img src="/screenshots/${client.id}.jpg?t=${Date.now()}" alt="Screen of ${client.user}" class="preview-img">
        <div class="preview-info">
          <div class="info-row">
            <span class="info-label">Loc:</span>
            <span class="info-value">${client.location}</span>
          </div>
          <div class="info-row">
            <span class="info-label">IP:</span>
            <span class="info-value">${client.ip}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">${client.id}</span>
          </div>
        </div>
      </div>
    `;
    card.onclick = () => {
      window.location.href = `client_control.html?clientId=${client.id}`;
    };
    gridView.appendChild(card);
  });
}

// Экспортируем всё в глобальный объект window
window.renderGrid = renderGrid;