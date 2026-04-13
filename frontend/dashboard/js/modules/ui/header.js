/* frontend/dashboard/js/modules/ui/header.js */

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

const savedBg = localStorage.getItem('selectedBackground');
if (savedBg) setBackground(savedBg);

export const updateHeaderContext = (tab) => {
    const isBots = tab === 'bots';
    document.querySelectorAll('#toggleView, .stat-box.clickable').forEach(el => {
        el.classList.toggle('disabled', !isBots);
        el.style.opacity = isBots ? '1' : '0.3';
        el.style.pointerEvents = isBots ? 'auto' : 'none';
        if (!isBots) el.classList.remove('active');
    });
};

export const applyStatusFilter = (clients, filter) => 
    (!filter || filter === 'all') ? clients : clients.filter(i => i.status === filter);

export const setActiveFilterUI = (filter, isGrid) => {
    document.querySelectorAll('.stat-box.clickable').forEach(el => {
        const type = el.id.replace('filter-', '');
        const isOnline = type === 'online';
        
        const active = isGrid ? isOnline : type === filter;
        const disabled = isGrid && !isOnline;

        el.classList.toggle('active', active);
        el.classList.toggle('disabled', disabled);
        el.style.opacity = disabled ? '0.3' : '1';
        el.style.pointerEvents = disabled ? 'none' : 'auto';
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

    document.onclick = (e) => {
        const btn = e.target.closest('#bgButton, .close-modal, .bg-option, #toggleView, .stat-box.clickable');
        if (!btn || btn.classList.contains('disabled')) return;

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
    };
}