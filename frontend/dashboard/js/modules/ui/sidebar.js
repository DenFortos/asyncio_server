/**
 * Управление состоянием боковой панели
 */
export function initializeSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('menuToggle');

    toggleBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('expanded');
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initializeSidebarToggle);