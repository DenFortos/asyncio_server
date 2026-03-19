/* frontend/dashboard/js/dashboard.js */

/* ==========================================================================
   1. ИМПОРТЫ И СОСТОЯНИЕ
========================================================================== */
import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients, checkDeadClients } from './modules/data/clients.js';
import { updateStats } from './modules/data/stats.js'; // <--- ВОЗВРАЩАЕМ ЭТУ СТРОКУ
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI, updateHeaderContext } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';

const state = { filter: 'all', search: '', tab: 'bots' };

/* ==========================================================================
   2. ЯДРО СИНХРОНИЗАЦИИ
========================================================================== */
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
   3. НАВИГАЦИЯ
========================================================================== */
function showTab(name) {
    state.tab = name.toLowerCase().trim().replace('section-', '');
    document.querySelectorAll('.content-section').forEach(s => {
        const isTarget = s.id === `section-${state.tab}`;
        s.classList.toggle('hidden', !isTarget);
        s.classList.toggle('active', isTarget);
    });
    updateHeaderContext(state.tab);
    syncUI();
}

/* ==========================================================================
   4. ИНИЦИАЛИЗАЦИЯ
========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    const login = localStorage.getItem('user_login');

    if (!token || !login) {
        window.location.href = '/sidebar/auth/auth.html';
        return;
    }

    initializeSidebar({ onTabChange: showTab });
    initializeHeader({
        Renderer,
        onViewToggled: (isGrid) => { if (isGrid) state.filter = 'online'; syncUI(); },
        onFilterChange: (f) => { state.filter = f; syncUI(); }
    });

    initializeSearch();
    connectWebSocket();
    
    // Запуск Watchdog (проверка мертвых ботов)
    setInterval(checkDeadClients, 1000);

    // Обработчики событий
    document.addEventListener('click', e => {
        const row = e.target.closest('.client-row, .client-card');
        if (row && !e.target.closest('button')) {
            window.location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`;
        }
    });

    window.addEventListener('searchUpdated', e => { state.search = e.detail; syncUI(); });
    ['clientsUpdated', 'clientUpdated', 'clientRemoved'].forEach(ev => window.addEventListener(ev, syncUI));

    showTab('bots');
});