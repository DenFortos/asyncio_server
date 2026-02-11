let isGridView = false;
const getS = (s) => s === 'online' ? 'online' : 'offline';

export const Renderer = {
    toggleView() {
        isGridView = !isGridView;
        window.dispatchEvent(new CustomEvent('viewToggled', { detail: isGridView }));
        return isGridView; // Возвращаем состояние для dashboard.js
    },

    render(clients) {
        const t = document.getElementById('table-container'),
              g = document.getElementById('grid-view');
        if (t && g) {
            t.classList.toggle('hidden', isGridView);
            g.classList.toggle('hidden', !isGridView);
            isGridView ? this.drawGrid(clients, g) : this.drawTable(clients, t);
        }
    },

    drawTable(clients, _) {
        const el = document.getElementById('clients-list');
        if (!el) return;
        el.innerHTML = clients.length ? clients.map(c => `
            <tr class="client-row" data-client-id="${c.id}">
                <td><span class="status-indicator status-${getS(c.status)}"></span> ${c.loc || '??'}</td>
                <td>${c.user || 'Anon'}</td>
                <td>${c.pc_name || 'PC'}</td>
                <td>${c.last_active || '--'}</td>
                <td>${c.ip || '0.0.0.0'}</td>
                <td class="text-truncate" title="${c.active_window || ''}">${c.active_window || 'Idle'}</td>
                <td class="client-id-cell">${c.id}</td>
            </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;opacity:0.5">No bots found</td></tr>';
    },

    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => `
            <div class="client-card glass-effect" data-client-id="${c.id}">
                <div class="card-status-dot status-${getS(c.status)}"></div>

                <div class="bot-preview">
                    <img src="../images/test2.jpg" alt="Preview">
                    <div class="preview-overlay">
                         <i class="fas fa-expand"></i>
                    </div>
                </div>

                <div class="bot-card-body">
                    <div class="bot-primary-info">
                        <span class="bot-user"><i class="fas fa-user"></i> ${c.user || 'Anon'}</span>
                        <span class="bot-loc"><img src="https://flagcdn.com/16x12/${(c.loc || 'un').toLowerCase()}.png" onerror="this.src='https://flagcdn.com/16x12/un.png'"> ${c.loc || '??'}</span>
                    </div>
                    <div class="bot-secondary-info">
                        <span class="bot-ip">${c.ip || '0.0.0.0'}</span>
                        <span class="bot-id">#${c.id}</span>
                    </div>
                </div>
            </div>`).join('') : '<div style="width:100%;text-align:center;padding:40px;opacity:0.5">No bots found</div>';
    }
};