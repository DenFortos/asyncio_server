// frontend/dashboard/js/modules/ui/search.js
// Фильтрация данных по поисковому запросу и инициализация обработчика ввода
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    return !q ? items : items.filter(({ id = '', ip = '', loc = '' }) => 
        [id, ip, loc].some(val => val.toString().toLowerCase().includes(q))
    );
};

export const initializeSearch = () => {
    const input = document.getElementById('universal-search');
    let timeout;
    
    input?.addEventListener('input', ({ target }) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('searchUpdated', { detail: target.value }));
        }, 150);
    });
};