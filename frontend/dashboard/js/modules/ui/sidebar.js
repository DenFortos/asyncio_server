// frontend/dashboard/js/modules/ui/sidebar.js
// Управление боковой панелью: переключение видимости и навигация по разделам
export const initializeSidebar = (callbacks) => {
    const sideBtn = document.getElementById('menuToggle');
    const icons = document.querySelectorAll('.sidebar .icon');
    const sections = document.querySelectorAll('.content-section');

    sideBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    icons.forEach(icon => {
        icon.onclick = () => {
            const { section: targetId } = icon.dataset;
            const tabName = (icon.getAttribute('title') || 'bots').toLowerCase();
            if (!targetId) return;

            icons.forEach(i => i.classList.toggle('active', i === icon));
            sections.forEach(s => {
                const active = s.id === targetId;
                s.classList.toggle('hidden', !active);
                s.classList.toggle('active', active);
            });

            callbacks?.onTabChange?.(tabName);
        };
    });
};