/* ==========================================================================
   1. ИМПОРТЫ МОДУЛЕЙ (Dependencies)
   ========================================================================== */
import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients, checkDeadClients } from './modules/data/clients.js';
import { updateStats } from './modules/data/stats.js';
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';

/* ==========================================================================
   2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (App State)
   ========================================================================== */
const state = {
    filter: 'all',
    search: '',
    tab: 'bots'
};

/* ==========================================================================
   3. ЯДРО ОБНОВЛЕНИЯ КОНТЕНТА (Core Logic)
   ========================================================================== */

/** Обновляет данные и синхронизирует UI фильтров */
const syncUI = () => {
    const isGrid = Renderer.getIsGridView();
    setActiveFilterUI(state.filter, isGrid);

    const rawData = getAllClients();
    const filtered = applyStatusFilter(rawData, state.filter);
    const searched = applySearchFilter(filtered, state.search);

    Renderer.render(searched);
};

/** Управляет навигацией по вкладкам */
function showTab(name) {
    state.tab = name.toLowerCase().trim();
    const isDataTab = ['bots', 'files'].includes(state.tab);

    // Переключение секций
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${state.tab}`);
        section.classList.toggle('hidden', section.id !== `section-${state.tab}`);
    });

    // Видимость инструментов управления
    document.querySelector('.global-search-container').style.display = isDataTab ? 'flex' : 'none';
    document.getElementById('toggleView').style.display = (state.tab === 'bots') ? 'flex' : 'none';

    if (isDataTab) syncUI();
}

/* ==========================================================================
   4. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ (App Launch)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 4.1 Инициализация UI модулей ---
    initializeSidebar({ onTabChange: showTab });

    initializeHeader({
        Renderer,
        onViewToggled: (isGrid) => {
            if (isGrid) state.filter = 'online'; // Авто-фильтр для сетки
            syncUI();
        },
        onFilterChange: (newFilter) => {
            state.filter = newFilter;
            state.tab !== 'bots' ? showTab('bots') : syncUI();
        },
        onViewRefresh: syncUI
    });

    initializeSearch();

    // --- 4.2 Сервисы и мониторинг ---
    connectWebSocket();
    updateStats();
    setInterval(checkDeadClients, 1000);

    // --- 4.3 Глобальные события (Клики и Поиск) ---
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

    // Реакция на изменения в базе клиентов
    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(event => {
        window.addEventListener(event, () => {
            syncUI();
            updateStats();
        });
    });

    // --- 4.4 Стартовая точка ---
    showTab('bots');
});