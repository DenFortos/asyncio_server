// frontend/dashboard/js/modules/ui/searh.js

/**
 * Фильтрация клиентов по ID, IP и Локации
 * @param {Array} items - Массив объектов клиентов
 * @param {string} query - Запрос из инпута
 */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    if (!q) return items;

    return items.filter(item => {
        // Извлекаем только нужные поля
        const fieldsToSearch = [
            item.id,
            item.ip,
            item.loc // Добавили локацию (RU, US и т.д.)
        ];

        return fieldsToSearch.some(field =>
            field?.toLowerCase().includes(q)
        );
    });
};

/**
 * Инициализация слушателя.
 * Мы используем Debounce (задержку), чтобы не перерисовывать таблицу
 * слишком часто при быстром наборе текста.
 */
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('search-input');
    let timeout;

    input?.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('searchUpdated', {
                detail: input.value
            }));
        }, 150); // Задержка 150мс для плавности
    });
});