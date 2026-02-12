// frontend/dashboard/js/modules/ui/sidebar.js

/* ==========================================================================
   1. КОНФИГУРАЦИЯ И НАСТРОЙКИ (Config)
   ========================================================================== */
const SELECTORS = {
    toggle: '#menuToggle',
    icons: '.sidebar .icon',
    bodyHideClass: 'sidebar-hidden'
};

/* ==========================================================================
   2. ЛОГИКА УПРАВЛЕНИЯ САЙДБАРОМ (Sidebar Core)
   ========================================================================== */

export function initializeSidebar(callbacks) {
    const toggleBtn = document.querySelector(SELECTORS.toggle);
    const sidebarIcons = document.querySelectorAll(SELECTORS.icons);

    if (!toggleBtn) {
        console.warn('Sidebar: Toggle button not found');
        return;
    }

    // --- 2.1 Сворачивание / Разворачивание ---
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle(SELECTORS.bodyHideClass);
    });

    // --- 2.2 Навигация по вкладкам ---
    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Берем название вкладки из title или data-section
            const tabName = icon.getAttribute('title')?.toLowerCase() ||
                           icon.dataset.section?.replace('section-', '') ||
                           'bots';

            // Визуальное переключение (UI Update)
            updateActiveIcon(sidebarIcons, icon);

            // Уведомляем Dashboard о смене вкладки (Callback)
            if (callbacks?.onTabChange) {
                callbacks.onTabChange(tabName);
            }
        });
    });
}

/* ==========================================================================
   3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (UI Helpers)
   ========================================================================== */

/** Обновляет активное состояние иконок */
function updateActiveIcon(allIcons, activeIcon) {
    allIcons.forEach(i => i.classList.remove('active'));
    activeIcon.classList.add('active');
}