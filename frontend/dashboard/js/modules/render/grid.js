// js/modules/render/grid.js

/**
 * Рендерит список клиентов в виде карточек (Grid View).
 * @param {Array<Object>} clients - Массив объектов клиентов для отображения.
 */
export function renderGrid(clients) {
  const gridContainer = document.getElementById('grid-view');
  if (!gridContainer) return;

  // Очистка контейнера
  gridContainer.innerHTML = '';

  clients.forEach(client => {
    // Используем 'pc_name' как в clients.js
    const pcName = client.pc_name || 'N/A';
    const statusClass = client.status === 'online' ? 'status-online' : 'status-offline';
    const screenshotUrl = client.screenshot || '../images/default.png';

    const card = document.createElement('div');
    // Добавляем класс статуса к карточке
    card.className = `client-card ${statusClass}`;
    card.setAttribute('data-client-id', client.id);

    card.innerHTML = `
      <div class="preview-container">
        <div class="card-status-dot"></div> <img src="${screenshotUrl}" class="preview-img" alt="Screenshot of ${pcName}" loading="lazy"/>
        <div class="preview-info">
          <div class="info-row main-info">
            <span class="info-label">${client.loc || '??'} | ${client.user || 'Anon'}</span>
          </div>
          <div class="info-row pc-name">
            <span class="info-value">${pcName}</span>
          </div>
          <div class="info-row detail-info">
            <span class="info-label">IP:</span>
            <span class="info-value">${client.ip || 'N/A'}</span>
          </div>
          <div class="info-row detail-info">
            <span class="info-label">Window:</span>
            <span class="info-value">${client.activeWindow || 'Idle'}</span>
          </div>
        </div>
      </div>
    `;
    gridContainer.appendChild(card);
  });
}