// js/modules/ui/search.js

/**
 * Универсальный поиск по массиву объектов
 * @param {Array} items - Данные (клиенты, файлы и т.д.)
 * @param {string} query - Поисковый запрос
 */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    if (!q) return items;

    return items.filter(item =>
        // Ищем совпадение в ID, IP или имени ПК
        [item.id, item.ip, item.pc_name, item.user]
            .some(field => field?.toLowerCase().includes(q))
    );
};

// Инициализация слушателя ввода
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('search-input');

    input?.addEventListener('input', () => {
        window.dispatchEvent(new CustomEvent('searchUpdated', {
            detail: input.value
        }));
    });
});