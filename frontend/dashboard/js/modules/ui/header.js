/* frontend/dashboard/js/modules/ui/header.js */

/* ==========================================================================
   1. КОНСТАНТЫ И ФОН (Constants & Background)
========================================================================== */
const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

// Авто-восстановление фона при загрузке
const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

/* ==========================================================================
   2. УПРАВЛЕНИЕ UI (UI Controls)
========================================================================== */
export const updateHeaderContext = (tabName) => {
    const isBots = tabName === 'bots';
    document.querySelectorAll('#toggleView, .stat-box.clickable').forEach(el => {
        el.classList.toggle('disabled', !isBots);
    });
};

export const applyStatusFilter = (clients, filter) => 
    (!filter || filter === 'all') ? clients : clients.filter(i => i.status === filter);

export const setActiveFilterUI = (filter, isGrid) => {
    document.querySelectorAll('.stat-box.clickable, #toggleView').forEach(el => {
        const type = el.id.replace('filter-', '');
        const isLocked = el.classList.contains('disabled') || (isGrid && ['all', 'offline'].includes(type));
        
        if (el.classList.contains('stat-box')) el.classList.toggle('active', type === filter);
        
        el.style.opacity = isLocked ? '0.4' : '1';
        el.style.pointerEvents = isLocked ? 'none' : 'auto';
        el.style.filter = isLocked ? 'grayscale(1)' : 'none';
    });
};

/* ==========================================================================
   3. ИНИЦИАЛИЗАЦИЯ (Initialization)
========================================================================== */
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
        if (!btn || (btn.classList.contains('disabled') && btn.id !== 'bgButton')) return;

        if (btn.id === 'bgButton') return modal?.classList.remove('hidden');
        if (btn.classList.contains('close-modal') || e.target === modal) return modal?.classList.add('hidden');
        
        if (btn.classList.contains('bg-option')) {
            setBackground(btn.dataset.bg);
            return modal?.classList.add('hidden');
        }

        if (btn.id === 'toggleView') return callbacks.onViewToggled(callbacks.Renderer.toggleView());
        if (btn.classList.contains('stat-box')) callbacks.onFilterChange(btn.id.replace('filter-', ''));
    });
}