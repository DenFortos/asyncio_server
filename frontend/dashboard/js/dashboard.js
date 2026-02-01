import { getAllClients } from './modules/data/clients.js';
import { renderClients, toggleView } from './modules/render/main.js';
import { applyStatusFilter } from './modules/ui/filters.js';
import { applySearchFilter } from './modules/ui/search.js';
import { connectWebSocket } from './modules/websocket/connection.js';

// 1. СОСТОЯНИЕ
const state = { filter: 'all', search: '', tab: 'clients' };

// 2. ЦЕНТРАЛЬНЫЙ КОНТРОЛЛЕР
const updateView = () => {
    const clients = applySearchFilter(applyStatusFilter(getAllClients(), state.filter), state.search);
    renderClients(clients);
};

/**
 * Управляет переключением разделов
 */
function showTab(tabName) {
    state.tab = tabName;
    const isClients = tabName === 'clients';

    // Скрываем всё, показываем нужное
    const sections = ['.files-container', '.alerts-container', '.table-container', '#stats-container', '#settings-container'];
    sections.forEach(s => {
        const el = document.querySelector(s);
        if (el) el.style.display = 'none';
    });

    const target = document.querySelector(tabName === 'clients' ? '.table-container' :
                   tabName === 'stats' || tabName === 'settings' ? `#${tabName}-container` : `.${tabName}-container`);

    if (target) target.style.display = ['stats', 'settings'].includes(tabName) ? 'flex' : 'block';

    // Управление UI-панелью (поиск и переключатель вида)
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) searchBar.style.display = ['alerts', 'stats', 'settings'].includes(tabName) ? 'none' : 'flex';

    const tvBtn = document.getElementById('toggleView');
    if (tvBtn) {
        tvBtn.disabled = !isClients;
        tvBtn.classList.toggle('inactive', !isClients);
    }

    if (['clients', 'files'].includes(tabName)) updateView();
}

/**
 * Управляет подсветкой активных кнопок
 */
function setActiveButton(button) {
    document.querySelectorAll('.icon, .filter-group button, .filter-buttons button').forEach(btn => btn.classList.remove('active'));
    button?.classList.add('active');
}

// 3. ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();

    // Делегирование для Сайдбара (иконки Files, Alerts, Stats, Settings)
    document.querySelector('.sidebar')?.addEventListener('click', (e) => {
        const icon = e.target.closest('.icon[title]');
        if (icon) {
            showTab(icon.getAttribute('title').toLowerCase());
            setActiveButton(icon);
        }
    });

    // Делегирование для Фильтров (All, Online, Offline)
    document.querySelector('.filter-group, .filter-buttons')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[id^="filter-"]');
        if (btn) {
            state.filter = btn.id.replace('filter-', '');
            setActiveButton(btn);
            showTab('clients');
        }
    });

    // Переключатель вида
    document.getElementById('toggleView')?.addEventListener('click', () => toggleView());

    // Глобальные события
    window.addEventListener('searchUpdated', (e) => {
        state.search = e.detail;
        if (['clients', 'files'].includes(state.tab)) updateView();
    });

    window.addEventListener('viewToggled', (e) => {
        const btn = document.getElementById('toggleView');
        if (btn) btn.innerHTML = e.detail ? '<i class="fas fa-list"></i> Table View' : '<i class="fas fa-th"></i> Grid View';
        updateView();
    });

    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => window.addEventListener(ev, updateView));

    // Переход в управление клиентом
    document.addEventListener('click', (e) => {
        const item = e.target.closest('[data-client-id]');
        if (item && !e.target.closest('button')) {
            window.location.href = `../client_control/client_control.html?id=${item.dataset.clientId}`;
        }
    });

    // Стартовое состояние
    setActiveButton(document.getElementById('filter-all'));
    showTab('clients');
    updateView();
});