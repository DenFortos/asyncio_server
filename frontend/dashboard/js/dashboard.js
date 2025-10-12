// js/dashboard.js

// 1. ИМПОРТЫ
import { getAllClients } from './modules/data/clients.js';
import { renderClients, toggleView } from './modules/render/main.js';
import { applyStatusFilter } from './modules/ui/filters.js';
import { applySearchFilter } from './modules/ui/search.js';
import { connectWebSocket } from './modules/websocket/connection.js';
//import { AlertsManager } from './modules/ui/alerts/AlertsManager.js'; // ⬅️ ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ #1: Импорт AlertsManager


// 2. ЛОКАЛЬНОЕ СОСТОЯНИЕ
let currentFilter = 'all';
let currentSearchQuery = '';
let activeTab = 'clients';


// 3. УПРАВЛЕНИЕ UI И КАРКАСОМ
// ---

/**
 * Управляет видимостью основных контейнеров, searchBar и кнопки ToggleView.
 * @param {string} tabName - Имя вкладки для отображения.
 */
function showTab(tabName) {
    activeTab = tabName;

    const searchBar = document.querySelector('.search-bar');
    const tableContainer = document.querySelector('.table-container');
    const toggleViewBtn = document.getElementById('toggleView');

    // Скрываем все основные контейнеры
    document.querySelectorAll('.files-container, .alerts-container, .table-container, #stats-container, #settings-container').forEach(el => {
        if (el) {
            el.style.display = 'none';
        }
    });

    // Определяем контейнер для показа
    let targetContainer;
    switch (tabName) {
        case 'files':
            targetContainer = document.querySelector('.files-container');
            break;
        case 'alerts':
            targetContainer = document.querySelector('.alerts-container');
            break;
        case 'stats':
            targetContainer = document.getElementById('stats-container');
            break;
        case 'settings':
            targetContainer = document.getElementById('settings-container');
            break;
        case 'clients':
        default:
            targetContainer = tableContainer;
            break;
    }

    // Показываем целевой контейнер
    if (targetContainer) {
        targetContainer.style.display = (tabName === 'alerts' || tabName === 'files' || tabName === 'clients') ? 'block' : 'flex';
    }

    // Управление видимостью searchBar
    const showSearch = (tabName !== 'alerts' && tabName !== 'stats' && tabName !== 'settings');
    if (searchBar) searchBar.style.display = showSearch ? 'flex' : 'none';

    // Управление кнопкой ToggleView
    const isActiveTab = (tabName === 'clients');

    if (toggleViewBtn) {
        toggleViewBtn.style.display = 'block';

        if (isActiveTab) {
            toggleViewBtn.classList.remove('inactive');
            toggleViewBtn.disabled = false;
        } else {
            toggleViewBtn.classList.add('inactive');
            toggleViewBtn.disabled = true;
        }
    }

    if (tabName === 'clients' || tabName === 'files') {
        updateView();
    }
}

/**
 * Устанавливает активное состояние для кнопки в сайдбаре или фильтре.
 * @param {HTMLElement} button - Элемент, который нужно активировать.
 */
function setActiveButton(button) {
    document.querySelectorAll('.icon, .filter-buttons button').forEach(btn => {
        btn.classList.remove('active');
    });
    if (button) {
        button.classList.add('active');
    }
}


// 4. ГЛАВНЫЙ КОНТРОЛЛЕР ДАННЫХ
// ---

/**
 * Применяет все активные фильтры (статус, поиск) и вызывает рендер.
 */
function updateView() {
    let clients = getAllClients();
    clients = applyStatusFilter(clients, currentFilter);
    clients = applySearchFilter(clients, currentSearchQuery);
    renderClients(clients);
}


// 5. ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
// ---

document.addEventListener('DOMContentLoaded', () => {

    const toggleViewBtn = document.getElementById('toggleView');

    // ⬅️ ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ #2: Инициализация AlertsManager
    // Теперь, когда модуль импортирован, его можно инициализировать.
    //window.alertsManager = new AlertsManager('alerts-grid');


    // --- Обработчики иконок в Sidebar ---

    document.querySelector('.icon[title="Files"]')?.addEventListener('click', (e) => {
        showTab('files');
        setActiveButton(e.currentTarget);
    });

    document.querySelector('.icon[title="Alerts"]')?.addEventListener('click', (e) => {
        showTab('alerts');
        setActiveButton(e.currentTarget);
    });

    document.querySelector('.icon[title="Stats"]')?.addEventListener('click', (e) => {
        showTab('stats');
        setActiveButton(e.currentTarget);
    });

    document.querySelector('.icon[title="Settings"]')?.addEventListener('click', (e) => {
        showTab('settings');
        setActiveButton(e.currentTarget);
    });


    // --- Обработчики кнопок фильтров ---

    document.querySelectorAll('#filter-all, #filter-online, #filter-offline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentFilter = e.currentTarget.id.replace('filter-', '');
        setActiveButton(e.currentTarget);
        showTab('clients');
      });
    });

    // --- Обработчик Toggle View ---
    toggleViewBtn?.addEventListener('click', () => {
        toggleView();
    });

    // --- Обработчики внутренних событий (Синхронизация) ---

    window.addEventListener('clientsUpdated', updateView);
    window.addEventListener('clientUpdated', updateView);
    window.addEventListener('clientRemoved', updateView);

    window.addEventListener('viewToggled', (e) => {
        const isGridView = e.detail;

        if (toggleViewBtn) {
            if (isGridView) {
                toggleViewBtn.innerHTML = '<i class="fas fa-list"></i> Table View';
            } else {
                toggleViewBtn.innerHTML = '<i class="fas fa-th"></i> Grid View';
            }
        }
        updateView();
    });

    window.addEventListener('searchUpdated', (e) => {
        currentSearchQuery = e.detail;
        if (activeTab === 'clients' || activeTab === 'files') {
             updateView();
        }
    });

    // --- Логика перехода на страницу управления клиентом ---

    const openClientControl = (clientId) => {
        if (clientId) {
            window.location.href = `../client_control/client_control.html?id=${clientId}`;
        }
    };

    document.addEventListener('click', (e) => {
        const row = e.target.closest('#table-view tbody tr');
        const card = e.target.closest('.client-card');

        if (row) {
            const clientId = row.getAttribute('data-client-id');
            openClientControl(clientId);
        } else if (card) {
            const clientId = card.getAttribute('data-client-id');
            openClientControl(clientId);
        }
    });

    // --- Инициализация при загрузке ---

    connectWebSocket();

    const initialFilterButton = document.getElementById('filter-all');
    setActiveButton(initialFilterButton);

    showTab('clients');

    // ⬅️ ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ #3: Принудительный вызов рендера
    updateView(); // <-- Это заставляет рендер произойти сразу
});