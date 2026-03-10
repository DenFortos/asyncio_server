// frontend/dashboard/js/modules/ui/renderer.js

/* ==========================================================================
   1. УТИЛИТЫ (Helpers)
========================================================================== */

const isOnline = (s) => s === 'online';

/** Превращает код страны (RU, US) в эмодзи-флаг. Не требует сети. */
const getFlagEmoji = (loc) => {
    if (!loc || loc.length !== 2) return '🏳️';
    return loc.toUpperCase().replace(/./g, char =>
        String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
};

const renderFlag = (loc) =>
    `<span class="flag-emoji" style="font-size:1.2rem; margin-right:8px; vertical-align:middle;">${getFlagEmoji(loc)}</span>`;

/* ==========================================================================
   2. ЯДРО ОТРИСОВКИ (Renderer Engine)
========================================================================== */

let isGridView = false;

export const Renderer = {
    getIsGridView: () => isGridView,

    toggleView() {
        isGridView = !isGridView;
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

    /* ==========================================================================
       3. ТАБЛИЧНЫЙ ШАБЛОН (Table Template)
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
                    ${renderFlag(c.loc)}
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

    /* ==========================================================================
       4. ПЛИТОЧНЫЙ ШАБЛОН (Grid Template)
    ========================================================================== */

    drawGrid(clients, container) {
        container.innerHTML = clients.length ? clients.map(c => {
            const online = isOnline(c.status);

            // Если превью нет, используем стандартную заглушку.
            // Но если превью пришло по WS (blob:), оно подставится сюда автоматически при рендере
            const currentPreview = c.lastPreview || "../images/test2.jpg";

            return `
            <div class="client-card" data-client-id="${c.id}">
                <div class="card-status-dot ${online ? 'online' : 'offline'}"></div>
                <div class="bot-preview">
                    <img src="${currentPreview}" id="prev-img-${c.id}"
                         style="opacity: ${c.lastPreview ? '1' : '0.5'}; transition: opacity 0.3s;"
                         alt="Preview">
                </div>
                <div class="bot-card-body">
                    <div class="bot-primary-info">
                        <span><i class="fas fa-user"></i> ${c.user || 'Anon'}</span>
                        <span>${renderFlag(c.loc)}</span>
                    </div>
                    <div class="bot-secondary-info">
                        <span class="${online ? 'status-online' : 'status-offline'}">${c.ip || '0.0.0.0'}</span>
                        <span class="bot-id">#${c.id}</span>
                    </div>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">No bots found</div>';
    }
};

/* ==========================================================================
   5. ЖИВОЕ ОБНОВЛЕНИЕ КАРТИНОК
========================================================================== */

window.addEventListener('botPreviewReceived', ({ detail }) => {
    const { id, url } = detail;
    const imgElement = document.getElementById(`prev-img-${id}`);

    if (imgElement) {
        // Просто обновляем src.
        // RevokeObjectURL делать здесь НЕ НУЖНО, так как мы сделали его в clients.js
        imgElement.src = url;
        imgElement.style.opacity = '1';
    }
});