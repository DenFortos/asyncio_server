/* frontend/dashboard/js/dashboard.js */
import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients } from './modules/data/clients.js';
import './modules/data/stats.js'; 
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI, updateHeaderContext } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';

const state = { filter: 'all', search: '', tab: 'bots' };

const syncUI = () => {
    // Проверка вкладки (учитываем оба варианта именования)
    if (state.tab !== 'bots' && state.tab !== 'section-bots') return;
    
    const all = getAllClients();
    setActiveFilterUI(state.filter, Renderer.getIsGridView());
    
    // Сначала фильтруем по статусу (online/offline/all)
    const filtered = applyStatusFilter(all, state.filter);
    // Затем применяем поиск
    const searched = applySearchFilter(filtered, state.search);
    
    Renderer.render(searched);
};

const showTab = (name) => {
    state.tab = name.toLowerCase().trim().replace('section-', '');
    document.querySelectorAll('.content-section').forEach(s => {
        const active = s.id === `section-${state.tab}` || s.id === state.tab;
        s.classList.toggle('hidden', !active);
        s.classList.toggle('active', active);
    });
    updateHeaderContext(state.tab);
    syncUI();
};

document.addEventListener('DOMContentLoaded', () => {
    const [t, l] = [localStorage.getItem('auth_token'), localStorage.getItem('user_login')];
    if (!t || !l) return window.location.href = '/sidebar/auth/auth.html';

    initializeSidebar({ onTabChange: showTab });
    initializeHeader({ 
        Renderer, 
        onViewToggled: () => syncUI(),
        onFilterChange: (f) => { state.filter = f; syncUI(); }
    });

    initializeSearch(); 
    connectWebSocket();

    // Клики по строкам
    document.addEventListener('click', e => {
        const row = e.target.closest('.client-row, .client-card');
        if (row && !e.target.closest('button')) {
            window.location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`;
        }
    });

    // Слушатели обновлений данных
    window.addEventListener('searchUpdated', e => { state.search = e.detail; syncUI(); });
    window.addEventListener('clientsUpdated', syncUI);

    // Инициализация
    showTab('section-bots');
});