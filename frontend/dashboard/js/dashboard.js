import { updateStats } from './modules/data/stats.js';
import { getAllClients } from './modules/data/clients.js';
import { Renderer } from './modules/ui/Renderer.js';
// Обновленные пути согласно твоему списку
import { applyStatusFilter } from './modules/ui/filters.js';
import { applySearchFilter } from './modules/ui/search.js';
import { connectWebSocket } from './modules/websocket/connection.js';

// Импорт инициализаций (background и sidebar теперь в ui)
import './modules/ui/background.js';
import './modules/ui/sidebar.js';

const state = { filter: 'all', search: '', tab: 'clients' };

const updateView = () => {
    const clients = applySearchFilter(applyStatusFilter(getAllClients(), state.filter), state.search);

    Renderer.render(clients);

    if (state.tab === 'files') {
        window.filesManager?.updateData(clients);
    }
};

function showTab(tabName) {
    state.tab = tabName;
    const isCl = tabName === 'clients';

    const containers = {
        clients: '.table-container',
        files: '.files-container',
        alerts: '.alerts-container',
        stats: '#stats-container',
        settings: '#settings-container'
    };

    Object.entries(containers).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.style.display = key === tabName ? (['stats', 'settings'].includes(key) ? 'flex' : 'block') : 'none';
    });

    const searchBar = document.querySelector('.search-bar');
    if (searchBar) searchBar.style.display = ['alerts', 'stats', 'settings'].includes(tabName) ? 'none' : 'flex';

    const tvBtn = document.getElementById('toggleView');
    if (tvBtn) {
        tvBtn.disabled = !isCl;
        tvBtn.classList.toggle('inactive', !isCl);
    }

    if (['clients', 'files'].includes(tabName)) updateView();
}

const setActive = (btn) => {
    document.querySelectorAll('.icon, .filter-group button, .filter-buttons button').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updateStats();

    document.addEventListener('click', (e) => {
        const icon = e.target.closest('.icon[title]');
        const filter = e.target.closest('button[id^="filter-"]');
        const row = e.target.closest('[data-client-id]');

        if (icon) { showTab(icon.title.toLowerCase()); setActive(icon); }
        if (filter) {
            state.filter = filter.id.replace('filter-', '');
            setActive(filter);
            showTab('clients');
        }
        if (row && !e.target.closest('button')) {
            location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`;
        }
    });

    document.getElementById('toggleView')?.addEventListener('click', () => {
        Renderer.toggleView();
    });

    window.addEventListener('searchUpdated', (e) => {
        state.search = e.detail;
        if (['clients', 'files'].includes(state.tab)) updateView();
    });

    window.addEventListener('viewToggled', (e) => {
        const btn = document.getElementById('toggleView');
        if (btn) btn.innerHTML = e.detail ? '<i class="fas fa-list"></i> Table View' : '<i class="fas fa-th"></i> Grid View';
        updateView();
    });

    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => {
        window.addEventListener(ev, () => {
            updateView();
            updateStats();
        });
    });

    setActive(document.getElementById('filter-all'));
    showTab('clients');
});