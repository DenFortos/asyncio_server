/* frontend/dashboard/js/modules/ui/header.js */

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

// Восстановление сохраненного фона при загрузке
const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

/**
 * Обновляет состояние кнопок управления в зависимости от активной вкладки
 */
export const updateHeaderContext = (tabName) => {
    const isBots = tabName === 'bots';
    document.querySelectorAll('#toggleView, .stat-box.clickable').forEach(el => {
        el.classList.toggle('disabled', !isBots);
    });
};

/**
 * Фильтрует список клиентов по статусу
 */
export const applyStatusFilter = (clients, filter) => 
    (!filter || filter === 'all') ? clients : clients.filter(i => i.status === filter);

/**
 * Обновляет визуальное состояние (акцент) кнопок статистики/фильтров
 */
export const setActiveFilterUI = (filter, isGrid) => {
    document.querySelectorAll('.stat-box.clickable').forEach(el => {
        const type = el.id.replace('filter-', '');
        
        // В режиме сетки активна только кнопка online
        if (isGrid) {
            const isOnline = type === 'online';
            el.classList.toggle('active', isOnline);
            el.classList.toggle('disabled', !isOnline);
            el.style.opacity = isOnline ? '1' : '0.3';
            el.style.pointerEvents = isOnline ? 'auto' : 'none';
        } else {
            // В режиме таблицы всё как обычно
            el.classList.toggle('active', type === filter);
            el.classList.remove('disabled');
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    });
};

/**
 * Инициализация обработчиков событий хедера
 */
export function initializeHeader(callbacks) {
    const modal = document.getElementById('bgModal');
    const grid = modal?.querySelector('.bg-options-grid');
    
    // Рендер опций выбора фона в модальном окне
    if (grid) {
        grid.innerHTML = BG_LIST.map(n => `
            <div class="bg-option" data-bg="../images/${n}.jpg">
                <img src="../images/${n}.jpg" alt="${n}">
                <span>Theme ${n.slice(2)}</span>
            </div>`).join('');
    }

    document.addEventListener('click', e => {
        const btn = e.target.closest('#bgButton, .close-modal, .bg-option, #toggleView, .stat-box.clickable');
        if (!btn) return;

        // --- Управление фоном ---
        if (btn.id === 'bgButton') return modal?.classList.remove('hidden');
        if (btn.classList.contains('close-modal') || e.target === modal) return modal?.classList.add('hidden');
        if (btn.classList.contains('bg-option')) {
            setBackground(btn.dataset.bg);
            return modal?.classList.add('hidden');
        }

        // Блокировка действий, если мы не на вкладке ботов
        if (btn.classList.contains('disabled')) return;

        // --- Переключение вида (Table / Grid) ---
        if (btn.id === 'toggleView') {
            const isGridNow = callbacks.Renderer.toggleView();
            // Убрана принудительная установка фильтра 'online' для теста скролла всех ботов
            return callbacks.onViewToggled(isGridNow);
        }

        // --- Логика фильтров статистики ---
        if (btn.classList.contains('stat-box')) {
            const filterType = btn.id.replace('filter-', '');
            
            // Теперь в режиме сетки разрешены все фильтры для проверки верстки
            callbacks.onFilterChange(filterType);
        }
    });
}