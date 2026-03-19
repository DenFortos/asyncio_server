/* frontend/dashboard/js/modules/ui/renderer.js */

/* ==========================================================================
   1. УТИЛИТЫ (Helpers)
========================================================================== */
const getFlag = (loc) => {
    if (!loc || loc.length !== 2) return '🏳️';
    return loc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
};

/* ==========================================================================
   2. ЯДРО ОТРИСОВКИ (Core Engine)
========================================================================== */
let isGridView = false;

export const Renderer = {
    getIsGridView: () => isGridView,
    toggleView: () => { isGridView = !isGridView; return isGridView; },

    render(clients) {
        const tableCont = document.getElementById('table-container');
        const gridCont = document.getElementById('grid-view');
        if (!tableCont || !gridCont) return;

        tableCont.classList.toggle('hidden', isGridView);
        gridCont.classList.toggle('hidden', !isGridView);

        isGridView ? this.drawGrid(clients, gridCont) : this.drawTable(clients);
    },

    /* --- Табличный вид (Table View) --- */
    drawTable(clients) {
        const el = document.getElementById('clients-list');
        if (!el) return;

        el.innerHTML = clients.length ? clients.map(c => {
            const online = c.status === 'online';
            return `
            <tr class="client-row" data-client-id="${c.id}">
                <td><span class="status-dot-mini ${online ? 'online' : 'offline'}"></span> ${getFlag(c.loc)}</td>
                <td>${c.user || 'Anon'}</td>
                <td>${c.pc_name || 'PC'}</td>
                <td class="${online ? 'status-online' : 'status-offline'}">${c.last_active || '--'}</td>
                <td class="${online ? 'status-online' : 'status-offline'}">${c.ip || '0.0.0.0'}</td>
                <td class="text-truncate" title="${c.active_window || ''}">${c.active_window || 'Idle'}</td>
                <td class="client-id-cell">${c.id}</td>
            </tr>`;
        }).join('') : '<tr><td colspan="7" class="empty-msg">No bots found</td></tr>';
    },

    /* --- Плиточный вид (Grid View) --- */
    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => {
            const online = c.status === 'online';
            const imgSrc = c.lastPreview || "../images/test2.jpg";
            const opacity = c.lastPreview ? '1' : '0.5';

            return `
            <div class="client-card" data-client-id="${c.id}">
                <div class="card-status-dot ${online ? 'online' : 'offline'}"></div>
                <div class="bot-preview">
                    <img src="${imgSrc}" id="prev-${c.id}" style="opacity:${opacity}; transition:opacity 0.3s" alt="Preview">
                </div>
                <div class="bot-card-body">
                    <div class="bot-primary-info"><span><i class="fas fa-user"></i> ${c.user || 'Anon'}</span> ${getFlag(c.loc)}</div>
                    <div class="bot-secondary-info">
                        <span class="${online ? 'status-online' : 'status-offline'}">${c.ip || '0.0.0.0'}</span>
                        <span class="bot-id">#${c.id}</span>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">No bots found</div>';
    },

    /* --- Точечное обновление превью (Live Preview Update) --- */
    updatePreview(id, url) {
        const img = document.getElementById(`prev-${id}`);
        if (img) {
            img.src = url;
            img.style.opacity = '1';
        }
    }
};