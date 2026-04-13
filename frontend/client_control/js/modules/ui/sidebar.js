/* frontend/client_control/js/modules/ui/sidebar.js */
export function initSidebar() {
    const $ = id => document.getElementById(id), header = $('header'), side = $('sidebar');

    $('sidebarToggle')?.addEventListener('click', e => {
        e.stopPropagation();
        side?.classList.toggle('hidden');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const { target: mode } = item.dataset;
            if (!mode) return;

            document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i === item));
            if (header) header.dataset.activeMode = mode;
            document.querySelectorAll('.view-panel').forEach(p => p.classList.toggle('active', p.id === `view-${mode}`));
            window.syncModeResources?.(mode);
            window.dispatchEvent(new Event('resize'));
        };
    });
}