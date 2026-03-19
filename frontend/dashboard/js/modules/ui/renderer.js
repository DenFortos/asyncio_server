/* frontend/dashboard/js/modules/ui/renderer.js */

const getFlag = (loc) => {
    if (!loc || loc.length !== 2) return '🏳️';
    return loc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
};

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

    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => {
            const imgSrc = c.lastPreview || "../images/test2.jpg";
            const opacity = c.lastPreview ? '1' : '0.5';

            return `
            <div class="client-card" data-client-id="${c.id}">
                <div class="bot-preview">
                    <img src="${imgSrc}" id="prev-${c.id}" alt="Preview" style="opacity:${opacity}">
                </div>
                <div class="bot-card-body">
                    <!-- НОВЫЙ ФОРМАТ: US: 127.0.0.1 | ID: ua4e1... -->
                    <div class="bot-info-row">
                        <span class="flag-emoji" title="${c.loc}">${getFlag(c.loc)}</span>
                        <div class="bot-data-string">
                            <span class="data-part-ip">${c.ip || '0.0.0.0'}</span>
                            <span class="data-separator"> | </span>
                            <span class="data-part-id" title="${c.id}">${c.id}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">No bots found</div>';
    },

    updatePreview(id, url) {
        const img = document.getElementById(`prev-${id}`);
        if (img) {
            img.src = url;
            img.style.opacity = '1';
        }
    }
};