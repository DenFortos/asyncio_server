/* frontend/dashboard/js/modules/ui/renderer.js */
const getFlag = (l) => (!l || l.length !== 2) ? '🏳️' : l.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));

let isGridView = false;

export const Renderer = {
    getIsGridView: () => isGridView,
    toggleView() {
        isGridView = !isGridView;
        const btn = document.getElementById('toggleView');
        if (btn) btn.innerHTML = isGridView ? '<i class="fas fa-list"></i> Table' : '<i class="fas fa-th"></i> Grid';
        return isGridView;
    },
    render(list) {
        const [tc, gc] = [document.getElementById('table-container'), document.getElementById('grid-view')];
        if (!tc || !gc) return;
        
        tc.classList.toggle('hidden', isGridView);
        gc.classList.toggle('hidden', !isGridView);
        
        isGridView ? this.drawGrid(list, gc) : this.drawTable(list);
    },
    drawTable(list) {
        const el = document.getElementById('clients-list');
        if (!el) return;
        el.innerHTML = list.length ? list.map(c => `
            <tr class="client-row ${c.status}" data-client-id="${c.id}">
                <td><span class="status-dot-mini ${c.status}"></span> ${getFlag(c.loc)}</td>
                <td>${c.user || '—'}</td><td>${c.pc_name || '—'}</td>
                <td class="time-cell">${c.last_active || '—'}</td><td>${c.ip || '—'}</td>
                <td class="text-truncate">${c.active_window || '—'}</td><td class="client-id-cell">${c.id}</td>
            </tr>`).join('') : '<tr><td colspan="7">No bots found</td></tr>';
    },
    drawGrid(list, cont) {
        cont.innerHTML = list.length ? list.map(c => `
            <div class="client-card ${c.status}" data-client-id="${c.id}">
                <div class="bot-preview">
                    <img src="${c.lastPreview || '../images/test2.jpg'}" id="prev-${c.id}" style="opacity:${c.status === 'online' ? 1 : 0.4}">
                    ${c.status !== 'online' ? '<div class="offline-overlay">OFFLINE</div>' : ''}
                </div>
                <div class="bot-card-body">
                    <span class="flag-emoji">${getFlag(c.loc)}</span> ${c.ip || '0.0.0.0'} | ${c.id}
                </div>
            </div>`).join('') : '<div class="empty-msg">No bots online</div>';
    }
};