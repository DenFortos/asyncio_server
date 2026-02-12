/* frontend/client_control/js/modules/ui/sidebar.js */

export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');

    // 1. Сворачивание / Разворачивание
    document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.toggle('hidden');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    // 2. Переключение режимов (Desktop / Webcam)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const mode = item.dataset.target;
            if (!mode) return;

            // Смена активных классов в навигации
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Синхронизация Header и Workspace через data-атрибуты и классы
            if (header) header.dataset.activeMode = mode;

            document.querySelectorAll('.view-panel').forEach(p =>
                p.classList.toggle('active', p.id === `view-${mode}`)
            );

            // Оркестрация ресурсов (выключение ненужных стримов)
            if (window.syncModeResources) window.syncModeResources(mode);

            window.dispatchEvent(new Event('resize'));
        };
    });
}