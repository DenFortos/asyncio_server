/* frontend/dashboard/js/modules/ui/header.js */

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

/**
 * Обновляет состояние кнопок управления: блокирует их и сбрасывает стили, если не вкладка ботов
 */
export const updateHeaderContext = (tabName) => {
    const isBots = tabName === 'bots';
    const controls = document.querySelectorAll('#toggleView, .stat-box.clickable');
    
    controls.forEach(el => {
        el.classList.toggle('disabled', !isBots);
        
        if (!isBots) {
            el.classList.remove('active');
            el.style.opacity = '0.3';
            el.style.pointerEvents = 'none';
        } else {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    });
};

export const applyStatusFilter = (clients, filter) => 
    (!filter || filter === 'all') ? clients : clients.filter(i => i.status === filter);

/**
 * Обновляет визуальное состояние фильтров
 */
export const setActiveFilterUI = (filter, isGrid) => {
    document.querySelectorAll('.stat-box.clickable').forEach(el => {
        const type = el.id.replace('filter-', '');
        
        if (isGrid) {
            const isOnline = type === 'online';
            el.classList.toggle('active', isOnline);
            el.classList.toggle('disabled', !isOnline);
            el.style.opacity = isOnline ? '1' : '0.3';
            el.style.pointerEvents = isOnline ? 'auto' : 'none';
        } else {
            el.classList.toggle('active', type === filter);
            el.classList.remove('disabled');
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
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

        if (btn.id === 'bgButton') return modal?.classList.remove('hidden');
        if (btn.classList.contains('close-modal') || e.target === modal) return modal?.classList.add('hidden');
        if (btn.classList.contains('bg-option')) {
            setBackground(btn.dataset.bg);
            return modal?.classList.add('hidden');
        }

        if (btn.classList.contains('disabled')) return;

        if (btn.id === 'toggleView') {
            const isGridNow = callbacks.Renderer.toggleView();
            return callbacks.onViewToggled(isGridNow);
        }

        if (btn.classList.contains('stat-box')) {
            callbacks.onFilterChange(btn.id.replace('filter-', ''));
        }
    });
}