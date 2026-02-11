// frontend/dashboard/js/modules/ui/search.js

/**
 * Фильтрация клиентов строго по ID, IP и Локации
 * @param {Array} items - Список объектов клиентов
 * @param {string} query - Строка поиска
 */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();

    // Если поисковый запрос пуст, возвращаем всех клиентов
    if (!q) return items;

    return items.filter(item => {
        // Извлекаем только нужные поля для поиска
        const id = item.id?.toString().toLowerCase() || "";
        const ip = item.ip?.toString().toLowerCase() || "";
        const loc = item.loc?.toString().toLowerCase() || "";

        // Проверяем, содержится ли запрос хотя бы в одном из этих полей
        return id.includes(q) || ip.includes(q) || loc.includes(q);
    });
};

/**
 * Инициализация слушателя инпута поиска
 */
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('universal-search');
    if (!input) return;

    let timeout;
    input.addEventListener('input', (e) => {
        // Используем небольшую задержку (debounce), чтобы не спамить рендером при каждом символе
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('searchUpdated', {
                detail: e.target.value
            }));
        }, 150);
    });
});