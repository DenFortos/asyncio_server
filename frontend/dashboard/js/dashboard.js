import { updateStats } from './modules/data/stats.js';
import { getAllClients, checkDeadClients } from './modules/data/clients.js';
import { Renderer } from './modules/ui/Renderer.js';
import { applyStatusFilter } from './modules/ui/filters.js';
import { applySearchFilter } from './modules/ui/search.js';
import { connectWebSocket } from './modules/websocket/connection.js';
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeBackgroundUI } from './modules/ui/background.js';

const state = { filter: 'all', search: '', tab: 'bots' };

const updateView = () => {
    const data = applySearchFilter(applyStatusFilter(getAllClients(), state.filter), state.search);
    Renderer.render(data);
};

function showTab(name) {
    state.tab = name.toLowerCase().trim();

    document.querySelectorAll('.content-section').forEach(s => {
        s.classList.toggle('active', s.id === `section-${state.tab}`);
        s.classList.toggle('hidden', s.id !== `section-${state.tab}`);
    });

    const isData = ['bots', 'files'].includes(state.tab);
    const search = document.querySelector('.global-search-container');
    const btn = document.getElementById('toggleView');

    if (search) search.style.display = isData ? 'flex' : 'none';
    if (btn) btn.style.display = (state.tab === 'bots') ? 'flex' : 'none';

    // ВИЗУАЛЬНЫЙ ФИКС: Принудительно подсвечиваем фильтр из памяти state
    const currentFilterEl = document.getElementById(`filter-${state.filter}`);
    if (currentFilterEl) {
        document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
        currentFilterEl.classList.add('active');
    }

    if (isData) updateView();
}

const setActiveUI = (el) => {
    if (!el) return;

    // Если нажата иконка сайдбара — чистим только сайдбар
    if (el.classList.contains('icon')) {
        document.querySelectorAll('.sidebar .icon').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
    }

    // Если нажат фильтр — чистим только фильтры и активируем иконку Bots
    if (el.classList.contains('stat-box')) {
        document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
        el.classList.add('active');

        document.querySelectorAll('.sidebar .icon').forEach(i => i.classList.remove('active'));
        document.querySelector('.icon[title="Bots"]')?.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updateStats();
    if (typeof initializeSidebar === 'function') initializeSidebar();
    if (typeof initializeBackgroundUI === 'function') initializeBackgroundUI();

    setInterval(checkDeadClients, 1000);

    document.addEventListener('click', e => {
        const icon = e.target.closest('.icon');
        const filter = e.target.closest('.stat-box.clickable');
        const row = e.target.closest('.client-row, .client-card');

        if (icon) {
            setActiveUI(icon);
            showTab(icon.getAttribute('title') || 'bots');
        } else if (filter) {
            state.filter = filter.id.replace('filter-', '');
            setActiveUI(filter);
            state.tab !== 'bots' ? showTab('bots') : updateView();
        } else if (row && !e.target.closest('button')) {
            const id = row.dataset.clientId;
            if (id) window.location.href = `../client_control/client_control.html?id=${id}`;
        }
    });

    const tvBtn = document.getElementById('toggleView');
    tvBtn?.addEventListener('click', () => {
        const isGrid = Renderer.toggleView();
        if (isGrid) {
            state.filter = 'online';
            setActiveUI(document.getElementById('filter-online'));
        }
        updateView();
    });

    window.addEventListener('searchUpdated', e => { state.search = e.detail; updateView(); });

    window.addEventListener('viewToggled', e => {
        if (tvBtn) tvBtn.innerHTML = e.detail ?
            '<i class="fas fa-list"></i> <span>Table View</span>' :
            '<i class="fas fa-th"></i> <span>Grid View</span>';
    });

    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => {
        window.addEventListener(ev, () => { updateView(); updateStats(); });
    });

    // Инициализация стартового состояния
    showTab('bots');
});