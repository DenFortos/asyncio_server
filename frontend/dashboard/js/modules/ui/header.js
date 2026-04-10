/* frontend/dashboard/js/modules/ui/header.js */

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

// Восстановление фона
const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

export const updateHeaderContext = (tabName) => {
    const isBots = tabName === 'bots';
    document.querySelectorAll('#toggleView, .stat-box.clickable').forEach(el => {
        el.classList.toggle('disabled', !isBots);
    });
};

export const applyStatusFilter = (clients, filter) => 
    (!filter || filter === 'all') ? clients : clients.filter(i => i.status === filter);

export const setActiveFilterUI = (filter, isGrid) => {
    document.querySelectorAll('.stat-box.clickable').forEach(el => {
        const type = el.id.replace('filter-', '');
        
        // В режиме сетки "все" и "оффлайн" блокируются
        const isLocked = isGrid && ['all', 'offline'].includes(type);
        
        // Определяем, должен ли этот бокс светиться как активный
        const isActive = isGrid ? type === 'online' : type === filter;
        
        el.classList.toggle('active', isActive);
        
        // Визуальная и функциональная блокировка
        el.style.opacity = isLocked ? '0.3' : '1';
        el.style.pointerEvents = isLocked ? 'none' : 'auto';
        el.style.filter = isLocked ? 'grayscale(1) brightness(0.7)' : 'none';
    });
};

export function initializeHeader(callbacks) {
    const modal = document.getElementById('bgModal');
    const grid = modal?.querySelector('.bg-options-grid');
    
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

        // Кнопка фона работает всегда
        if (btn.id === 'bgButton') return modal?.classList.remove('hidden');
        if (btn.classList.contains('close-modal') || e.target === modal) return modal?.classList.add('hidden');
        if (btn.classList.contains('bg-option')) {
            setBackground(btn.dataset.bg);
            return modal?.classList.add('hidden');
        }

        // Блокировка действий, если кнопка помечена disabled (не на вкладке ботов)
        if (btn.classList.contains('disabled')) return;

        // Логика переключения вида (Table/Grid)
        if (btn.id === 'toggleView') {
            const isGridNow = callbacks.Renderer.toggleView();
            // Если включили сетку, принудительно уведомляем dashboard о фильтре 'online'
            if (isGridNow) callbacks.onFilterChange('online');
            return callbacks.onViewToggled(isGridNow);
        }

        // Логика фильтров
        if (btn.classList.contains('stat-box')) {
            const filterType = btn.id.replace('filter-', '');
            // Запрещаем клик по Total/Offline в режиме сетки
            if (callbacks.Renderer.getIsGridView() && filterType !== 'online') return;
            callbacks.onFilterChange(filterType);
        }
    });
}