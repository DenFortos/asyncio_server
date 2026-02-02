// js/modules/render/grid.js

/**
 * Рендерит сетку карточек клиентов
 */
export function renderGrid(clients) {
    const container = document.getElementById('grid-view');
    if (!container) return;

    container.innerHTML = clients.map(c => {
        const isOnline = c.status === 'online';
        // Если скриншота нет или он слишком короткий (битый), ставим заглушку
        const thumb = (c.screenshot?.length > 100) ? c.screenshot : '../images/default.png';

        return `
            <div class="client-card ${isOnline ? 'status-online' : 'status-offline'}" data-client-id="${c.id}">
                <div class="preview-container">
                    <div class="card-status-dot"></div>
                    <img src="${thumb}" class="preview-img" alt="Screen" loading="lazy"/>
                    <div class="preview-info">
                        <div class="info-row main-info">
                            <span>${c.loc || '??'} | ${c.user || 'Anon'}</span>
                        </div>
                        <div class="info-row pc-name">
                            <span>${c.pc_name || 'N/A'}</span>
                        </div>
                        <div class="info-row detail-info">
                            <span class="info-label">IP:</span>
                            <span class="info-value">${c.ip || 'N/A'}</span>
                        </div>
                        <div class="info-row detail-info">
                            <span class="info-label">Window:</span>
                            <span class="info-value text-truncate">${c.activeWindow || 'Idle'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}