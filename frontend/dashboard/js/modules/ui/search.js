// frontend/dashboard/js/modules/ui/search.js

/* ==========================================================================
   1. ЛОГИКА ФИЛЬТРАЦИИ (Filter Core)
========================================================================== */

/**
 * Проверяет соответствие элементов поисковому запросу.
 * Ищет совпадения по ID, IP и Локации.
 */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    if (!q) return items;

    return items.filter(({ id = '', ip = '', loc = '' }) =>
        [id, ip, loc].some(val =>
            val.toString().toLowerCase().includes(q)
        )
    );
};

/* ==========================================================================
   2. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА (UI Setup)
========================================================================== */

export function initializeSearch() {
    const searchInput = document.getElementById('universal-search');
    if (!searchInput) {
        console.warn('Search: Input field "#universal-search" not found');
        return;
    }

    let searchTimeout;

    // Слушатель ввода с оптимизацией (Debounce)
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value;

        // Сбрасываем таймер при каждом нажатии клавиши
        clearTimeout(searchTimeout);

        // Запускаем поиск только если пользователь сделал паузу в 150мс
        searchTimeout = setTimeout(() => {
            dispatchSearchEvent(value);
        }, 150);
    });
}

/* ==========================================================================
   3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (Events)
========================================================================== */

/** Отправляет кастомное событие с данными поиска */
function dispatchSearchEvent(query) {
    window.dispatchEvent(new CustomEvent('searchUpdated', {
        detail: query
    }));
}