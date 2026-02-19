/* frontend/dashboard/js/modules/ui/header.js */

/* ==========================================================================
   1. УПРАВЛЕНИЕ ФОНОМ (Background Management)
========================================================================== */

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

export const setBackground = (p) => {
    document.body.style.backgroundImage = `url(${p})`;
    localStorage.setItem('selectedBackground', p);
};

const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

/* ==========================================================================
   2. КОНТЕКСТ И ФИЛЬТРАЦИЯ (Context & Filters)
========================================================================== */

/** Управляет состоянием кнопок при смене вкладок */
export const updateHeaderContext = (tabName) => {
    const isBots = tabName === 'bots';
    const controls = document.querySelectorAll('#toggleView, .stat-box.clickable');

    controls.forEach(el => {
        el.classList.toggle('disabled', !isBots);
    });
};

export const applyStatusFilter = (c, f) => (!f || f === 'all') ? c : c.filter(i => i.status === f);

/** Визуальное обновление активных фильтров в UI */
export const setActiveFilterUI = (f, isGrid) => {
    document.querySelectorAll('.stat-box.clickable, #toggleView').forEach(el => {
        const type = el.id.replace('filter-', '');
        const isTabLocked = el.classList.contains('disabled');
        const isGridLocked = isGrid && (type === 'all' || type === 'offline');
        const locked = isTabLocked || isGridLocked;

        if (el.classList.contains('stat-box')) {
            el.classList.toggle('active', type === f);
        }

        el.style.opacity = locked ? '0.4' : '1';
        el.style.pointerEvents = locked ? 'none' : 'auto';
        el.style.filter = locked ? 'grayscale(1)' : 'none';
    });
};

/* ==========================================================================
   3. СТАТИСТИКА (Header Stats)
========================================================================== */

export const updateHeaderStats = (stats) => {
    const ids = { online: 'online-count', total: 'total-count', offline: 'offline-count' };
    Object.entries(ids).forEach(([k, v]) => {
        const el = document.getElementById(v);
        if (el) el.textContent = stats[k] || 0;
    });
};

/* ==========================================================================
   4. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ (Init & Listeners)
========================================================================== */

export function initializeHeader(callbacks) {
    const modal = document.getElementById('bgModal');
    const grid = modal?.querySelector('.bg-options-grid');
    if (grid) grid.innerHTML = BG_LIST.map(n => `
        <div class="bg-option" data-bg="../images/${n}.jpg">
            <img src="../images/${n}.jpg" alt="${n}">
            <span>Theme ${n.slice(2)}</span>
        </div>`).join('');

    document.addEventListener('click', e => {
        const btn = e.target.closest('#bgButton, .close-modal, .bg-option, #toggleView, .stat-box.clickable');
        if (!btn || (btn.classList.contains('disabled') && btn.id !== 'bgButton')) return;

        if (btn.id === 'bgButton') return modal?.classList.remove('hidden');
        if (btn.classList.contains('close-modal') || e.target === modal) return modal?.classList.add('hidden');

        if (btn.classList.contains('bg-option')) {
            setBackground(btn.dataset.bg);
            return modal?.classList.add('hidden');
        }

        if (btn.id === 'toggleView') {
            return callbacks.onViewToggled(callbacks.Renderer.toggleView());
        }

        if (btn.classList.contains('stat-box')) {
            callbacks.onFilterChange(btn.id.replace('filter-', ''));
        }
    });
}