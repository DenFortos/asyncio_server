window.renderGrid = (clients) => {
  const gridContainer = document.getElementById('grid-view');
  gridContainer.innerHTML = '';

  clients.forEach(client => {
    const card = document.createElement('div');
    card.className = 'client-card';
    card.setAttribute('data-client-id', client.id);

    // Исправленный путь к изображению
    const screenshotUrl = client.screenshot || '../images/default.png';

    card.innerHTML = `
      <div class="preview-container">
        <img src="${screenshotUrl}" class="preview-img" />
        <div class="preview-info">
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">${client.id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">IP:</span>
            <span class="info-value">${client.ip || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
    gridContainer.appendChild(card);
  });
};