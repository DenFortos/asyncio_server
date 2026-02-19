/* frontend/dashboard/js/modules/ui/sidebar.js */

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ ПАНЕЛИ (Sidebar Init)
========================================================================== */

export function initializeSidebar(callbacks) {
    const toggleBtn = document.getElementById('menuToggle');
    const sidebarIcons = document.querySelectorAll('.sidebar .icon');

    // Переключение видимости боковой панели
    toggleBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-hidden'));

    /* ==========================================================================
       2. НАВИГАЦИЯ ПО ВКЛАДКАМ (Tab Navigation)
    ========================================================================== */

    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Определение целевой секции (bots, files, settings)
            const tabName = (icon.getAttribute('title') || icon.dataset.section || 'bots').toLowerCase();

            // Визуальное переключение активного состояния
            sidebarIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            // Уведомление системы о смене вкладки
            if (callbacks?.onTabChange) {
                callbacks.onTabChange(tabName);
            }
        });
    });
}