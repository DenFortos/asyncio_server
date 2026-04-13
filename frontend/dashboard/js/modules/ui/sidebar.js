/* frontend/dashboard/js/modules/ui/sidebar.js */
export function initializeSidebar(callbacks) {
    const $ = id => document.getElementById(id);
    const sideBtn = $('menuToggle'), icons = document.querySelectorAll('.sidebar .icon');
    const sections = document.querySelectorAll('.content-section');

    sideBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    icons.forEach(icon => {
        icon.onclick = () => {
            const { section: targetId } = icon.dataset;
            const tabName = (icon.getAttribute('title') || 'bots').toLowerCase();
            if (!targetId) return;

            icons.forEach(i => i.classList.toggle('active', i === icon));
            sections.forEach(s => {
                const isTarget = s.id === targetId;
                s.classList.toggle('hidden', !isTarget);
                s.classList.toggle('active', isTarget);
            });

            callbacks?.onTabChange?.(tabName);
        };
    });
}