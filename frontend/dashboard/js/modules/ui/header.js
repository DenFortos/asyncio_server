/* frontend/dashboard/js/modules/ui/header.js
/* ==========================================================================
   1. ТЕМЫ И ФОН (Theme Management)
   ========================================================================== */
const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

export const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

// Самоисполняющаяся установка фона при импорте
const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

const initBackgroundOptions = (modal) => {
    const grid = modal?.querySelector('.bg-options-grid');
    if (grid) grid.innerHTML = BG_LIST.map(name => `
        <div class="bg-option" data-bg="../images/${name}.jpg">
            <img src="../images/${name}.jpg" alt="${name}" loading="lazy">
            <span>Theme ${name.slice(2)}</span>
        </div>
    `).join('');
};

/* ==========================================================================
   2. ФИЛЬТРАЦИЯ И СТАТИСТИКА (UI State)
   ========================================================================== */

export const applyStatusFilter = (clients, filter) =>
    (!filter || filter === 'all') ? clients : clients.filter(c => c.status === filter);

/** Синхронизирует визуальное состояние кнопок фильтров */
export const setActiveFilterUI = (filterType, isGrid = false) => {
    document.querySelectorAll('.stat-box.clickable').forEach(box => {
        const type = box.id.replace('filter-', '');
        const isLocked = isGrid && (type === 'all' || type === 'offline');

        box.classList.toggle('active', type === filterType);
        box.classList.toggle('disabled', isLocked);

        // Блокировка взаимодействия, если активен Grid (кроме Online)
        box.style.opacity = isLocked ? '0.5' : '1';
        box.style.pointerEvents = isLocked ? 'none' : 'auto';
    });
};

/** Обновляет цифры статистики в шапке */
export const updateHeaderStats = (stats) => {
    const ids = { online: 'online-count', total: 'total-count', offline: 'offline-count' };
    Object.entries(ids).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = stats[key] || 0;
    });
};

/* ==========================================================================
   3. ИНИЦИАЛИЗАЦИЯ (Event Delegation)
   ========================================================================== */

export function initializeHeader(callbacks) {
    const modal = document.getElementById('bgModal');
    initBackgroundOptions(modal);

    document.addEventListener('click', (e) => {
        const t = e.target;

        // 1. Модальное окно тем
        if (t.closest('#bgButton')) return modal?.classList.remove('hidden');
        if (t.closest('.close-modal') || t === modal) return modal?.classList.add('hidden');
        if (t.closest('.bg-option')) {
            setBackground(t.closest('.bg-option').dataset.bg);
            return modal?.classList.add('hidden');
        }

        // 2. Вид (Grid/Table) - берем состояние напрямую из Renderer
        if (t.closest('#toggleView')) {
            const isGrid = callbacks.Renderer.toggleView();
            return callbacks.onViewToggled(isGrid);
        }

        // 3. Фильтры (Статистика)
        const statBox = t.closest('.stat-box.clickable');
        if (statBox && !statBox.classList.contains('disabled')) {
            callbacks.onFilterChange(statBox.id.replace('filter-', ''));
        }
    });
}