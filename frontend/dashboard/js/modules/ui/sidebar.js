// frontend/dashboard/js/modules/ui/sidebar.js

export function initializeSidebar() {
    const toggleBtn = document.getElementById('menuToggle');

    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-hidden');
    });
}