// frontend/dashboard/js/modules/ui/renderer.js

const getFlag = (loc) => {
    if (!loc || typeof loc !== 'string' || loc.length !== 2) return '🏳️';
    return loc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
};

let isGridView = false;

export const Renderer = {
    getIsGridView: () => isGridView,
    
    render(clients) {
        const tableCont = document.getElementById('table-container');
        const gridCont = document.getElementById('grid-view');
        if (!tableCont || !gridCont) return;

        tableCont.classList.toggle('hidden', isGridView);
        gridCont.classList.toggle('hidden', !isGridView);

        isGridView ? this.drawGrid(clients, gridCont) : this.drawTable(clients);
    },

drawTable(clients) {
        const el = document.getElementById('clients-list');
        if (!el) return;

        el.innerHTML = clients.length ? clients.map(c => {
            const online = c.status === 'online';
            
            // Используем "—" (длинное тире) для пустых полей
            const user = c.user && c.user !== 'Unknown' ? c.user : '—';
            const pc = c.pc_name || '—';
            const ip = c.ip && c.ip !== '0.0.0.0' ? c.ip : '—';
            const win = c.active_window || '—';
            const last = c.last_active || '—';

            return `
            <tr class="client-row" data-client-id="${c.id}">
                <td><span class="status-dot-mini ${online ? 'online' : 'offline'}"></span> ${getFlag(c.loc)}</td>
                <td>${user}</td>
                <td>${pc}</td>
                <td class="${online ? 'status-online' : 'status-offline'}">${last}</td>
                <td class="${online ? 'status-online' : 'status-offline'}">${ip}</td>
                <td class="text-truncate" title="${win}">${win}</td>
                <td class="client-id-cell">${c.id}</td>
            </tr>`;
        }).join('') : '<tr><td colspan="7" class="empty-msg">No bots found</td></tr>';
    },

    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => {
            const imgSrc = c.lastPreview || "../images/test2.jpg";
            const ip = c.ip && c.ip !== '0.0.0.0' ? c.ip : '—';
            
            return `
            <div class="client-card" data-client-id="${c.id}">
                <div class="bot-preview">
                    <img src="${imgSrc}" id="prev-${c.id}" alt="Preview" style="opacity:${c.lastPreview ? '1' : '0.5'}">
                </div>
                <div class="bot-card-body">
                    <div class="bot-info-row">
                        <span class="flag-emoji" title="${c.loc || 'Unknown'}">${getFlag(c.loc)}</span>
                        <div class="bot-data-string">
                            <span class="data-part-ip">${ip}</span>
                            <span class="data-separator"> | </span>
                            <span class="data-part-id" title="${c.id}">${c.id}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">No bots found</div>';
    }
};