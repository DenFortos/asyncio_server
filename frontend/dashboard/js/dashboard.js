import { connectWebSocket } from './modules/websocket/connection.js';
import { getAllClients } from './modules/data/clients.js';
import './modules/data/stats.js';
import { initializeSidebar } from './modules/ui/sidebar.js';
import { initializeHeader, applyStatusFilter, setActiveFilterUI, updateHeaderContext } from './modules/ui/header.js';
import { initializeSearch, applySearchFilter } from './modules/ui/search.js';
import { Renderer } from './modules/ui/renderer.js';
import { FilesManager } from './modules/sidebar/files.js';
import { SettingsManager } from './modules/sidebar/settings.js';

const state = { filter: 'all', search: '', tab: 'bots' };

const syncUI = () => {
    if (state.tab !== 'bots') return;
    
    const all = getAllClients();
    setActiveFilterUI(state.filter, Renderer.getIsGridView());
    
    const filtered = applyStatusFilter(all, state.filter);
    const searched = applySearchFilter(filtered, state.search);
    
    Renderer.render(searched);
};

const handleTabChange = (name) => {
    const searchInput = document.getElementById('universal-search');
    state.tab = name.replace('section-', '');
    
    updateHeaderContext(state.tab);
    if (searchInput) {
        searchInput.value = '';
        state.search = '';
    }

    if (state.tab === 'bots') syncUI();
    else if (state.tab === 'files') FilesManager.render([]);
    else if (state.tab === 'settings') SettingsManager.render();
};

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

    document.addEventListener('click', e => {
        const row = e.target.closest('.client-row, .client-card');
        const btn = e.target.closest('button');
        
        if (row && !btn) {
            window.location.href = `../client_control/client_control.html?id=${row.dataset.clientId}`;
        }
    });

    window.addEventListener('searchUpdated', e => {
        state.search = e.detail;
        syncUI();
    });
    
    window.addEventListener('clientsUpdated', syncUI);
    handleTabChange('bots');
});