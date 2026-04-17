// frontend/client_control/js/modules/ui/sidebar.js

// Управление боковой панелью и навигацией между режимами просмотра
export const initSidebar = () => {
  const $ = id => document.getElementById(id);
  const side = $('sidebar'), head = $('header'), items = document.querySelectorAll('.nav-item');

  // Переключение видимости сайдбара с уведомлением системы об изменении размера
  $('sidebarToggle')?.addEventListener('click', e => {
    e.stopPropagation();
    side?.classList.toggle('hidden');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  });

  // Логика переключения вкладок и панелей управления
  items.forEach(item => {
    item.onclick = () => {
      const { target: mode } = item.dataset;
      if (!mode) return;

      items.forEach(i => i.classList.toggle('active', i === item));
      head && (head.dataset.activeMode = mode);
      
      document.querySelectorAll('.view-panel').forEach(p => 
        p.classList.toggle('active', p.id === `view-${mode}`)
      );

      window.syncModeResources?.(mode);
      window.dispatchEvent(new Event('resize'));
    };
  });
};