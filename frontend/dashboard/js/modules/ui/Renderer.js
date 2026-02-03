// js/modules/ui/Renderer.js

let isGridView = false;

// Хелперы для чистоты шаблонов
const getS = (s) => s === 'online' ? 'online' : 'offline';
const getImg = (img) => (img?.length > 100) ? img : '../images/default.png';

export const Renderer = {
    toggleView() {
        isGridView = !isGridView;
        window.dispatchEvent(new CustomEvent('viewToggled', { detail: isGridView }));
        return isGridView;
    },

    render(clients) {
        const t = document.getElementById('table-view'), g = document.getElementById('grid-view');
        if (!t || !g) return;

        t.style.display = isGridView ? 'none' : 'table';
        g.style.display = isGridView ? 'flex' : 'none';

        isGridView ? this.drawGrid(clients, g) : this.drawTable(clients, t);
    },

    drawTable(clients, container) {
        const tbody = container.querySelector('#clients-list');
        if (!tbody) return;
        tbody.innerHTML = clients.map(c => `
            <tr class="client-row" data-client-id="${c.id}">
                <td><span class="status-indicator status-${getS(c.status)}"></span> ${c.loc || '??'}</td>
                <td>${c.user || 'Anon'}</td>
                <td>${c.pc_name || c['pc-name'] || 'N/A'}</td>
                <td>${c.last_active || 'N/A'}</td>
                <td>${c.ip || '0.0.0.0'}</td>
                <td class="text-truncate">${c.activeWindow || c.active_window || 'Idle'}</td>
                <td class="client-id-cell">${c.id}</td>
            </tr>`).join('');
    },

    drawGrid(clients, container) {
        container.innerHTML = clients.map(c => `
            <div class="client-card state-${getS(c.status)}" data-client-id="${c.id}">
                <div class="preview-container">
                    <div class="card-status-dot status-${getS(c.status)}"></div>
                    <img src="${getImg(c.screenshot)}" class="preview-img" loading="lazy"/>
                    <div class="preview-info">
                        <div>${c.loc || '??'} | ${c.user || 'Anon'}</div>
                        <div class="pc-name">${c.pc_name || 'N/A'}</div>
                        <div class="detail-info">IP: ${c.ip || 'N/A'}</div>
                        <div class="detail-info text-truncate">${c.activeWindow || 'Idle'}</div>
                    </div>
                </div>
            </div>`).join('');
    }
};