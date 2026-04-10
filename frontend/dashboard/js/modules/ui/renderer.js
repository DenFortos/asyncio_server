const getFlag = (loc) => {
    if (!loc || typeof loc !== 'string' || loc.length !== 2) return '🏳️';
    // Конвертация кода страны в Emoji флага
    return loc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
};

let isGridView = false;

export const Renderer = {
    getIsGridView: () => isGridView,
    
    toggleView() {
        isGridView = !isGridView;
        const btn = document.getElementById('toggleView');
        if (btn) {
            btn.innerHTML = isGridView ? 
                '<i class="fas fa-list"></i> <span>Table View</span>' : 
                '<i class="fas fa-th"></i> <span>Grid View</span>';
        }
        return isGridView;
    },

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
            const user = c.user && c.user !== 'Unknown' ? c.user : '—';
            const pc = c.pc_name || '—';
            const ip = (c.ip && c.ip !== '0.0.0.0') ? c.ip : '—';
            const win = c.active_window || '—';
            const last = c.last_active || '—';

            return `
            <tr class="client-row ${online ? 'row-online' : 'row-offline'}" data-client-id="${c.id}">
                <td><span class="status-dot-mini ${online ? 'online' : 'offline'}"></span> ${getFlag(c.loc)}</td>
                <td>${user}</td>
                <td>${pc}</td>
                <td class="time-cell">${last}</td>
                <td>${ip}</td>
                <td class="text-truncate" title="${win}">${win}</td>
                <td class="client-id-cell">${c.id}</td>
            </tr>`;
        }).join('') : '<tr><td colspan="7" class="empty-msg">No bots in database</td></tr>';
    },

    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => {
            const imgSrc = c.lastPreview || "../images/test2.jpg";
            const online = c.status === 'online';
            
            return `
            <div class="client-card ${online ? 'card-online' : 'card-offline'}" data-client-id="${c.id}">
                <div class="bot-preview">
                    <img src="${imgSrc}" id="prev-${c.id}" alt="Preview" style="opacity:${online ? '1' : '0.4'}">
                    ${!online ? '<div class="offline-overlay">OFFLINE</div>' : ''}
                </div>
                <div class="bot-card-body">
                    <div class="bot-info-row">
                        <span class="flag-emoji">${getFlag(c.loc)}</span>
                        <div class="bot-data-string">
                            <span class="data-part-ip">${c.ip || '0.0.0.0'}</span>
                            <span class="data-separator"> | </span>
                            <span class="data-part-id">${c.id}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">No bots online for grid view</div>';
    }
};