// js/dashboard.js

// 1. ИМПОРТЫ
import { getAllClients } from './modules/data/clients.js';
import { renderClients, toggleView } from './modules/render/main.js';
import { applyStatusFilter } from './modules/ui/filters.js';
import { applySearchFilter } from './modules/ui/search.js';


// 2. ЛОКАЛЬНОЕ СОСТОЯНИЕ
let currentFilter = 'all';        // Текущий фильтр статуса ('all', 'online', 'offline')
let currentSearchQuery = '';      // Текущий поисковый запрос
let activeTab = 'clients';        // Активная вкладка ('clients', 'files', 'alerts', 'stats', 'settings')


// 3. УПРАВЛЕНИЕ UI И КАРКАСОМ
// ---

/**
 * Управляет видимостью основных контейнеров, searchBar и кнопки ToggleView.
 * @param {string} tabName - Имя вкладки для отображения.
 */
function showTab(tabName) {
    activeTab = tabName;

    // Получение элементов
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
        // Используем block или flex в зависимости от того, как выглядит контейнер в CSS
        targetContainer.style.display = (tabName === 'alerts' || tabName === 'files' || tabName === 'clients') ? 'block' : 'flex';
    }

    // Управление видимостью searchBar
    const showSearch = (tabName !== 'alerts' && tabName !== 'stats' && tabName !== 'settings');
    if (searchBar) searchBar.style.display = showSearch ? 'flex' : 'none';

    // -----------------------------------------------------------------
    // КОРРЕКТНАЯ ЛОГИКА УПРАВЛЕНИЯ КНОПКОЙ ToggleView (для решения бага)
    // -----------------------------------------------------------------
    const isActiveTab = (tabName === 'clients');

    if (toggleViewBtn) {
        // Делаем кнопку видимой, но управляем её активностью/неактивностью
        toggleViewBtn.style.display = 'block';

        if (isActiveTab) {
            // Вкладка Clients: кнопка активна и доступна
            toggleViewBtn.classList.remove('inactive');
            toggleViewBtn.disabled = false;
        } else {
            // Вкладка Files, Alerts, Stats, Settings: кнопка неактивна и заблокирована
            toggleViewBtn.classList.add('inactive');
            toggleViewBtn.disabled = true;
        }
    }

    // Если перешли на вкладку клиентов или файлов (которые используют данные), вызываем рендер
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
 * Эта функция вызывается после ЛЮБОГО изменения, чтобы гарантировать актуальность вида.
 */
function updateView() {
    // Получаем исходные данные
    let clients = getAllClients();

    // 1. Фильтрация по статусу
    clients = applyStatusFilter(clients, currentFilter);

    // 2. Фильтрация по поиску
    clients = applySearchFilter(clients, currentSearchQuery);

    // 3. Вызов рендера (из main.js), передаем УЖЕ ОТФИЛЬТРОВАННЫЕ данные.
    renderClients(clients);
}


// 5. ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
// ---

document.addEventListener('DOMContentLoaded', () => {

    const toggleViewBtn = document.getElementById('toggleView');

    // --- Обработчики иконок в Sidebar (Переключение вкладок) ---

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


    // --- Обработчики кнопок фильтров (Возврат на вкладку Clients) ---

    document.querySelectorAll('#filter-all, #filter-online, #filter-offline').forEach(btn => {
      btn.addEventListener('click', (e) => {

        // 1. Устанавливаем текущий фильтр и активность
        currentFilter = e.currentTarget.id.replace('filter-', '');
        setActiveButton(e.currentTarget);

        // 2. Переключаемся на основной вид ('clients')
        showTab('clients');
      });
    });

    // --- Обработчик Toggle View ---

    toggleViewBtn?.addEventListener('click', () => {
        // Вызываем функцию из main.js, которая меняет состояние и генерирует событие 'viewToggled'
        toggleView();
    });

    // --- Обработчики внутренних событий (Синхронизация) ---

    // Обновление после изменения данных в clients.js
    window.addEventListener('clientsUpdated', updateView);
    window.addEventListener('clientUpdated', updateView);
    window.addEventListener('clientRemoved', updateView);

    // Событие после смены состояния isGridView в main.js
    window.addEventListener('viewToggled', (e) => {
        const isGridView = e.detail;

        // Обновление UI кнопки
        if (toggleViewBtn) {
            if (isGridView) {
                toggleViewBtn.innerHTML = '<i class="fas fa-list"></i> Table View';
            } else {
                toggleViewBtn.innerHTML = '<i class="fas fa-th"></i> Grid View';
            }
        }

        // Вызываем центральный рендер с активными фильтрами/поиском
        updateView();
    });

    // Обновление после ввода текста в search.js
    window.addEventListener('searchUpdated', (e) => {
        currentSearchQuery = e.detail;
        // Обновляем вид, если мы на вкладке, использующей поиск
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

    // Устанавливаем начальное активное состояние
    const initialFilterButton = document.getElementById('filter-all');
    setActiveButton(initialFilterButton);

    // Устанавливаем основной вид
    showTab('clients');
});