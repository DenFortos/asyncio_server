/* frontend/client_control/js/modules/ui/sidebar.js */

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ САЙДБАРА (Sidebar Init)
========================================================================== */

export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');

    // Переключение видимости меню
    document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar?.classList.toggle('hidden');

        // Пересчет размеров Canvas после завершения анимации CSS
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    /* ==========================================================================
       2. ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ПРОСМОТРА (View Switching)
    ========================================================================== */

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const mode = item.dataset.target;
            if (!mode) return;

            // Визуальное обновление навигации
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Обновление атрибута хедера (для контекстных стилей CSS)
            if (header) header.dataset.activeMode = mode;

            // Переключение панелей (Desktop / Webcam)
            document.querySelectorAll('.view-panel').forEach(p =>
                p.classList.toggle('active', p.id === `view-${mode}`)
            );

            // Авто-очистка ресурсов (выключаем старый поток при переходе в новый)
            if (window.syncModeResources) {
                window.syncModeResources(mode);
            }

            // Глобальный триггер изменения размера для корректного масштабирования стрима
            window.dispatchEvent(new Event('resize'));
        };
    });
}