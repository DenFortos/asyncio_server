/* frontend/dashboard/js/dashboard.js */
import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients, checkDeadClients } from './modules/data/clients.js';
import { updateStats } from './modules/data/stats.js';
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI, updateHeaderContext } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';

const state = {
    filter: 'all',
    search: '',
    tab: 'bots'
};

const syncUI = () => {
    if (state.tab !== 'bots' && state.tab !== 'files') return;

    const isGrid = Renderer.getIsGridView();
    setActiveFilterUI(state.filter, isGrid);

    const rawData = getAllClients();
    console.log("[UI] Данных для отрисовки:", rawData.length);
    const filtered = applyStatusFilter(rawData, state.filter);
    const searched = applySearchFilter(filtered, state.search);

    Renderer.render(searched);
};

function showTab(name) {
    state.tab = name.toLowerCase().trim().replace('section-', '');

    // Переключение видимости секций
    document.querySelectorAll('.content-section').forEach(s => {
        const isTarget = s.id === `section-${state.tab}`;
        s.classList.toggle('hidden', !isTarget);
        s.classList.toggle('active', isTarget);
    });

    updateHeaderContext(state.tab);
    syncUI();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar({ onTabChange: showTab });
    initializeHeader({
        Renderer,
        onViewToggled: (isGrid) => {
            if (isGrid) state.filter = 'online';
            syncUI();
        },
        onFilterChange: (newFilter) => {
            state.filter = newFilter;
            syncUI();
        }
    });

    initializeSearch();
    connectWebSocket();
    // updateStats() вызовется сам через событие при загрузке данных
    setInterval(checkDeadClients, 1000);

    document.addEventListener('click', e => {
        const row = e.target.closest('.client-row, .client-card');
        if (row && !e.target.closest('button')) {
            window.location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`;
        }
    });

    window.addEventListener('searchUpdated', e => {
        state.search = e.detail;
        syncUI();
    });

    // Слушаем изменения данных для перерисовки
    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => {
        window.addEventListener(ev, syncUI);
    });

    showTab('bots');
});