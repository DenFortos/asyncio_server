/* frontend/client_control/js/modules/ui/sidebar.js */

export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');

    // 1. Сворачивание / Разворачивание меню
    document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.toggle('hidden');
        // Даем время на анимацию, затем уведомляем систему о пересчете размеров (для Canvas)
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

            // Устанавливаем режим в хедере (для CSS стилей)
            if (header) header.dataset.activeMode = mode;

            // Переключение видимости панелей (view-desktop, view-webcam)
            document.querySelectorAll('.view-panel').forEach(p =>
                p.classList.toggle('active', p.id === `view-${mode}`)
            );

            // Оркестрация ресурсов (выключение стрима другой вкладки)
            if (window.syncModeResources) {
                window.syncModeResources(mode);
            }

            // Триггер для подстройки размеров Canvas под новое окно
            window.dispatchEvent(new Event('resize'));
        };
    });
}