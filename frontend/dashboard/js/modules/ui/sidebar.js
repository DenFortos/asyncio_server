/* frontend/dashboard/js/modules/ui/sidebar.js */
export function initializeSidebar(callbacks) {
    const toggleBtn = document.getElementById('menuToggle');
    const sidebarIcons = document.querySelectorAll('.sidebar .icon');

    toggleBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Берем title (например, "Bots", "Files") или данные из атрибута
            const tabName = (icon.getAttribute('title') || icon.dataset.section || 'bots').toLowerCase();

            sidebarIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            // Передаем чистое имя: "bots", "files", "settings"
            if (callbacks?.onTabChange) {
                callbacks.onTabChange(tabName);
            }
        });
    });
}