/* frontend/dashboard/js/modules/ui/sidebar.js */
export function initializeSidebar(callbacks) {
    const toggleBtn = document.getElementById('menuToggle');
    const icons = document.querySelectorAll('.sidebar .icon');
    const sections = document.querySelectorAll('.content-section');

    toggleBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    icons.forEach(icon => {
        icon.addEventListener('click', () => {
            const targetId = icon.dataset.section;
            const tabName = (icon.getAttribute('title') || 'bots').toLowerCase();

            if (!targetId) return;

            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            // Переключение видимости секций
            sections.forEach(s => {
                const isTarget = s.id === targetId;
                s.classList.toggle('hidden', !isTarget);
                s.classList.toggle('active', isTarget);
            });

            if (callbacks?.onTabChange) callbacks.onTabChange(tabName);
        });
    });
}