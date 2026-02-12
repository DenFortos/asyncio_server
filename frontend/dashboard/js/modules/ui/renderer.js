// frontend/dashboard/js/modules/ui/renderer.js

/* ==========================================================================
   1. УТИЛИТЫ (Helpers)
   ========================================================================== */
const isOnline = (s) => s === 'online';
const getFlagUrl = (loc) => `https://flagcdn.com/16x12/${(loc || 'un').toLowerCase()}.png`;

const renderFlag = (loc) =>
    `<img src="${getFlagUrl(loc)}" class="flag-icon" onerror="this.src='${getFlagUrl('un')}'">`;

/* ==========================================================================
   2. ЯДРО ОТРИСОВКИ (Renderer Engine)
   ========================================================================== */
let isGridView = false;

export const Renderer = {
    // Получить текущий режим (нужно для синхронизации в Dashboard/Header)
    getIsGridView: () => isGridView,

    // Переключение режима
    toggleView() {
        isGridView = !isGridView;
        return isGridView;
    },

    // Главный метод рендеринга
    render(clients) {
        const tableCont = document.getElementById('table-container');
        const gridCont = document.getElementById('grid-view');

        if (!tableCont || !gridCont) return;

        // Переключаем видимость контейнеров
        tableCont.classList.toggle('hidden', isGridView);
        gridCont.classList.toggle('hidden', !isGridView);

        // Вызываем нужный метод отрисовки
        isGridView ? this.drawGrid(clients, gridCont) : this.drawTable(clients);
    },

    /* ==========================================================================
       3. ШАБЛОНЫ (Templates)
       ========================================================================== */

    drawTable(clients) {
        const el = document.getElementById('clients-list');
        if (!el) return;

        el.innerHTML = clients.length ? clients.map(c => {
            const online = isOnline(c.status);
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
        container.innerHTML = clients.length ? clients.map(c => `
            <div class="client-card" data-client-id="${c.id}">
                <div class="card-status-dot ${isOnline(c.status) ? 'online' : 'offline'}"></div>
                <div class="bot-preview"><img src="../images/test2.jpg" alt="Preview"></div>
                <div class="bot-card-body">
                    <div class="bot-primary-info">
                        <span><i class="fas fa-user"></i> ${c.user || 'Anon'}</span>
                        <span>${renderFlag(c.loc)} ${c.loc || '??'}</span>
                    </div>
                    <div class="bot-secondary-info">
                        <span class="${isOnline(c.status) ? 'status-online' : 'status-offline'}">${c.ip || '0.0.0.0'}</span>
                        <span class="bot-id">#${c.id}</span>
                    </div>
                </div>
            </div>`).join('') : '<div class="empty-msg">No bots found</div>';
    }
};