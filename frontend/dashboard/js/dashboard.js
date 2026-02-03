import { updateStats } from './modules/data/stats.js';
import { getAllClients, checkDeadClients } from './modules/data/clients.js'; // Добавили импорт проверки
import { Renderer } from './modules/ui/Renderer.js';
import { applyStatusFilter } from './modules/ui/filters.js';
import { applySearchFilter } from './modules/ui/search.js';
import { connectWebSocket } from './modules/websocket/connection.js';

import './modules/ui/background.js';
import './modules/ui/sidebar.js';

const state = { filter: 'all', search: '', tab: 'clients' };

const updateView = () => {
    const clients = applySearchFilter(applyStatusFilter(getAllClients(), state.filter), state.search);
    Renderer.render(clients);
    if (state.tab === 'files' && window.filesManager) window.filesManager.updateData(clients);
};

function showTab(tabName) {
    const target = tabName.toLowerCase().trim();
    state.tab = target;

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
        el.style.display = key === target ? (['stats', 'settings'].includes(key) ? 'flex' : 'block') : 'none';
    });

    const searchBar = document.querySelector('.search-bar');
    if (searchBar) searchBar.style.display = ['alerts', 'stats', 'settings'].includes(target) ? 'none' : 'flex';

    const tvBtn = document.getElementById('toggleView');
    if (tvBtn) {
        tvBtn.disabled = target !== 'clients';
        tvBtn.style.opacity = target === 'clients' ? "1" : "0.5";
    }

    if (['clients', 'files'].includes(target)) updateView();
}

const setActive = (btn) => {
    if (!btn) return;
    btn.blur();

    document.querySelectorAll('.icon, button[id^="filter-"]').forEach(el => el.classList.remove('active'));

    if (btn.id?.startsWith('filter-')) {
        btn.classList.add('active');
        const clientsIcon = document.querySelector('.icon[title="Clients"]');
        if (clientsIcon) clientsIcon.classList.add('active');
    } else {
        btn.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updateStats();

    // ЗАПУСК МОНИТОРИНГА: Проверяем статус ботов каждую секунду
    setInterval(checkDeadClients, 1000);

    document.addEventListener('click', (e) => {
        const icon = e.target.closest('.icon[title]');
        const filter = e.target.closest('button[id^="filter-"]');
        const row = e.target.closest('.client-row, .client-card');

        if (icon) {
            e.preventDefault();
            setActive(icon);
            showTab(icon.getAttribute('title'));
            return;
        }

        if (filter) {
            e.preventDefault();
            state.filter = filter.id.replace('filter-', '');
            setActive(filter);
            if (state.tab !== 'clients') showTab('clients');
            else updateView();
            return;
        }

        if (row && !e.target.closest('button')) {
            const id = row.dataset.clientId;
            if (id) location.href = `../client_control/client_control.html?id=${id}`;
        }
    });

    document.getElementById('toggleView')?.addEventListener('click', () => Renderer.toggleView());

    window.addEventListener('searchUpdated', (e) => {
        state.search = e.detail;
        updateView();
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

    // Инициализация дефолтного фильтра
    setActive(document.getElementById('filter-all'));
    showTab('clients');
});