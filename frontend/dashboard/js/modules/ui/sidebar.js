/* frontend/dashboard/js/modules/ui/sidebar.js */

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ (Initialization)
========================================================================== */
export function initializeSidebar(callbacks) {
    const toggleBtn = document.getElementById('menuToggle');
    const icons = document.querySelectorAll('.sidebar .icon');

    // Toggle Sidebar Visibility
    toggleBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    // Tab Navigation
    icons.forEach(icon => {
        icon.addEventListener('click', () => {
            const tabName = (icon.getAttribute('title') || icon.dataset.section || 'bots').toLowerCase();
            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            if (callbacks?.onTabChange) callbacks.onTabChange(tabName);
        });
    });
}