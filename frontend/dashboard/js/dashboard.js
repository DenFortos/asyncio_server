// frontend/dashboard/js/dashboard.js
import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients } from './modules/data/clients.js';
import './modules/data/stats.js';
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI, updateHeaderContext } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';
import { FilesManager } from './modules/sidebar/files.js';
import { SettingsManager } from './modules/sidebar/settings.js';

const $ = id => document.getElementById(id);
const state = { filter: 'all', search: '', tab: 'bots' };

// Синхронизация интерфейса: фильтрация, поиск и рендер списка клиентов
const syncUI = () => {
    if (state.tab !== 'bots') return;

    const { filter, search } = state;
    const all = getAllClients();
    
    setActiveFilterUI(filter, Renderer.getIsGridView());

    const filtered = applyStatusFilter(all, filter);
    const searched = applySearchFilter(filtered, search);

    Renderer.render(searched);
};

// Переключение вкладок дашборда и очистка контекста поиска
const handleTabChange = (name) => {
    const input = $('universal-search');
    state.tab = name.replace('section-', '');

    updateHeaderContext(state.tab);
    
    if (input) {
        input.value = '';
        state.search = '';
    }

    state.tab === 'bots' && syncUI();
    state.tab === 'files' && FilesManager.render([]);
    state.tab === 'settings' && SettingsManager.render();
};

// Инициализация приложения, проверка авторизации и установка слушателей событий
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('auth_token')) {
        return window.location.href = '/sidebar/auth/auth.html';
    }

    SettingsManager.init();
    initializeSidebar({ onTabChange: handleTabChange });
    initializeHeader({
        Renderer,
        onViewToggled: syncUI,
        onFilterChange: (f) => {
            state.filter = f;
            syncUI();
        }
    });

    initializeSearch();
    connectWebSocket();

    document.addEventListener('click', ({ target }) => {
        const row = target.closest('.client-row, .client-card');
        const btn = target.closest('button');

        (row && !btn) && (window.location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`);
    });

    window.addEventListener('searchUpdated', e => {
        state.search = e.detail;
        syncUI();
    });

    window.addEventListener('clientsUpdated', syncUI);
    handleTabChange('bots');
});