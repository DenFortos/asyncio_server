// js/modules/ui/search.js

/**
 * Применяет фильтр по поисковому запросу.
 * @param {Array<Object>} items - Массив объектов (клиентов, файлов, и т.д.).
 * @param {string} query - Строка поиска (пользовательский ввод).
 * @returns {Array<Object>} Отфильтрованный массив.
 */
export function applySearchFilter(items, query) {
  if (!query) {
    return items;
  }

  const lowerQuery = query.toLowerCase().trim();

  // Поиск по ключевым полям: id и ip (как вы указали)
  return items.filter(item => {
    // Проверка наличия и поиск в ключевых полях клиента
    return (
      item.id?.toLowerCase().includes(lowerQuery) ||
      item.ip?.includes(lowerQuery) ||
      item.pc_name?.toLowerCase().includes(lowerQuery) // Добавляем pc_name для удобства
      // Здесь можно добавить логику поиска по файлам, когда будет готов модуль files
    );
  });
}

// ----------------------------------------------------------------------
// Подписка на ввод
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // Оповещаем dashboard.js о необходимости обновить вид
            window.dispatchEvent(new CustomEvent('searchUpdated', {
                detail: searchInput.value
            }));
        });
    }
});