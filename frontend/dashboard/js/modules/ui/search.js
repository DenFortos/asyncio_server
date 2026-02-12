// frontend/dashboard/js/modules/ui/search.js

/**
 * Фильтрация клиентов (ID, IP, Location)
 */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    if (!q) return items;

    return items.filter(({ id = '', ip = '', loc = '' }) =>
        [id, ip, loc].some(val => val.toString().toLowerCase().includes(q))
    );
};

/**
 * Инициализация поиска с Debounce
 */
export function initializeSearch() {
    const input = document.getElementById('universal-search');
    if (!input) return;

    let timeout;
    input.addEventListener('input', ({ target }) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('searchUpdated', {
                detail: target.value
            }));
        }, 150);
    });
}