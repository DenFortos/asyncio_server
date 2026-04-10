/* frontend/dashboard/js/modules/ui/sidebar.js */

export function initializeSidebar(callbacks) {
    const toggleBtn = document.getElementById('menuToggle');
    const icons = document.querySelectorAll('.sidebar .icon');

    toggleBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    icons.forEach(icon => {
        icon.addEventListener('click', () => {
            const tabName = (icon.dataset.section || icon.getAttribute('title') || 'bots').toLowerCase();
            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            if (callbacks?.onTabChange) callbacks.onTabChange(tabName);
        });
    });
}