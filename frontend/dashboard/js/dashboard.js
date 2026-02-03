import { updateStats } from './modules/data/stats.js';
import { getAllClients } from './modules/data/clients.js';
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

/**
 * ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ПОДСВЕТКИ
 */
const setActive = (btn) => {
    if (!btn) return;

    // Снимаем фокус с кнопки, чтобы убрать браузерное состояние :focus (то самое "вжатие")
    btn.blur();

    // 1. Полная очистка ВСЕХ активных элементов в навигации
    document.querySelectorAll('.icon, button[id^="filter-"]').forEach(el => {
        el.classList.remove('active');
    });

    // 2. Если нажата кнопка фильтра (Online/Offline/All)
    if (btn.id?.startsWith('filter-')) {
        btn.classList.add('active');
        // Подсвечиваем иконку Clients, так как фильтры относятся к ней
        const clientsIcon = document.querySelector('.icon[title="Clients"]');
        if (clientsIcon) clientsIcon.classList.add('active');
    }
    // 3. Если нажата иконка в сайдбаре
    else {
        btn.classList.add('active');
        // Если нажали не на Clients, сбрасываем фильтры на "All" визуально (опционально)
        // Но сейчас просто оставим активным то, что нажато
    }
};

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updateStats();

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
        if (btn) {
            btn.innerHTML = e.detail ? '<i class="fas fa-list"></i> Table View' : '<i class="fas fa-th"></i> Grid View';
        }
        updateView();
    });

    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => {
        window.addEventListener(ev, () => { updateView(); updateStats(); });
    });

    // Инициализация
    const defaultFilter = document.getElementById('filter-all');
    setActive(defaultFilter);
    showTab('clients');
});