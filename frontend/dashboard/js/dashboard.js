/* frontend/dashboard/js/dashboard.js */
import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients, checkDeadClients } from './modules/data/clients.js';
import { updateStats } from './modules/data/stats.js';
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI, updateHeaderContext } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';

// ГЛОБАЛЬНОЕ СОСТОЯНИЕ (Только одно объявление!)
const state = {
    filter: 'all',
    search: '',
    tab: 'bots'
};

/** Синхронизация данных и интерфейса */
const syncUI = () => {
    const isGrid = Renderer.getIsGridView();

    // 1. Обновляем визуальное состояние кнопок (заморозка/активность)
    setActiveFilterUI(state.filter, isGrid);

    // 2. Фильтруем и рендерим данные
    const rawData = getAllClients();
    const filtered = applyStatusFilter(rawData, state.filter);
    const searched = applySearchFilter(filtered, state.search);

    Renderer.render(searched);
};

/** Переключение вкладок */
function showTab(name) {
    // Очищаем имя от лишних приставок
    state.tab = name.toLowerCase().trim().replace('section-', '');

    const targetSectionId = `section-${state.tab}`;
    const sections = document.querySelectorAll('.content-section');

    sections.forEach(s => {
        const isTarget = s.id === targetSectionId;
        s.classList.toggle('hidden', !isTarget);
        s.classList.toggle('active', isTarget);
    });

    // ОБЯЗАТЕЛЬНО: Обновляем статус кнопок в шапке (ставим класс .disabled)
    updateHeaderContext(state.tab);

    // Вызываем отрисовку, если нужно
    if (state.tab === 'bots' || state.tab === 'files') {
        syncUI();
    }
}

/* ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ */
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
    updateStats();
    setInterval(checkDeadClients, 1000);

    // Глобальные события (переход в клиент и поиск)
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

    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => {
        window.addEventListener(ev, () => {
            syncUI();
            updateStats();
        });
    });

    showTab('bots');
});