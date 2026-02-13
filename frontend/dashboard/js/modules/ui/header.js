/* frontend/dashboard/js/modules/ui/header.js */
const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

export const setBackground = (p) => {
    document.body.style.backgroundImage = `url(${p})`;
    localStorage.setItem('selectedBackground', p);
};

const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

/** * Управляет состоянием кнопок при смене вкладок.
 * Эта функция теперь только ставит маркер (класс disabled).
 */
export const updateHeaderContext = (tabName) => {
    const isBots = tabName === 'bots';
    const controls = document.querySelectorAll('#toggleView, .stat-box.clickable');

    controls.forEach(el => {
        el.classList.toggle('disabled', !isBots);
    });
};

export const applyStatusFilter = (c, f) => (!f || f === 'all') ? c : c.filter(i => i.status === f);

/** * Синхронизирует фильтры и принудительно гасит ВСЁ,
 * если кнопка имеет класс .disabled (значит мы не в Bots)
 */
export const setActiveFilterUI = (f, isGrid) => {
    document.querySelectorAll('.stat-box.clickable, #toggleView').forEach(el => {
        const isStatBox = el.classList.contains('stat-box');
        const type = isStatBox ? el.id.replace('filter-', '') : null;

        // Кнопка заблокирована либо вкладкой (disabled), либо режимом Grid
        const isTabLocked = el.classList.contains('disabled');
        const isGridLocked = isGrid && (type === 'all' || type === 'offline');
        const shouldBeDisabled = isTabLocked || isGridLocked;

        if (isStatBox) el.classList.toggle('active', type === f);

        // Применяем финальные стили "заморозки"
        Object.assign(el.style, {
            opacity: shouldBeDisabled ? '0.4' : '1',
            pointerEvents: shouldBeDisabled ? 'none' : 'auto',
            filter: shouldBeDisabled ? 'grayscale(1)' : 'none'
        });
    });
};

export const updateHeaderStats = (stats) => {
    const ids = { online: 'online-count', total: 'total-count', offline: 'offline-count' };
    Object.entries(ids).forEach(([k, v]) => {
        const el = document.getElementById(v);
        if (el) el.textContent = stats[k] || 0;
    });
};

export function initializeHeader(callbacks) {
    const modal = document.getElementById('bgModal');
    const grid = modal?.querySelector('.bg-options-grid');
    if (grid) grid.innerHTML = BG_LIST.map(n => `
        <div class="bg-option" data-bg="../images/${n}.jpg">
            <img src="../images/${n}.jpg" alt="${n}">
            <span>Theme ${n.slice(2)}</span>
        </div>`).join('');

    document.addEventListener('click', e => {
        const t = e.target;
        const btn = t.closest('#bgButton, .close-modal, .bg-option, #toggleView, .stat-box.clickable');
        if (!btn || (btn.classList.contains('disabled') && btn.id !== 'bgButton')) return;

        if (btn.id === 'bgButton') return modal?.classList.remove('hidden');
        if (btn.classList.contains('close-modal') || t === modal) return modal?.classList.add('hidden');
        if (btn.classList.contains('bg-option')) {
            setBackground(btn.dataset.bg);
            return modal?.classList.add('hidden');
        }
        if (btn.id === 'toggleView') return callbacks.onViewToggled(callbacks.Renderer.toggleView());
        if (btn.classList.contains('stat-box')) callbacks.onFilterChange(btn.id.replace('filter-', ''));
    });
}