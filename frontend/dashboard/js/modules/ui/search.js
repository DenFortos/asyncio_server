/* frontend/dashboard/js/modules/ui/search.js */

/* ==========================================================================
   1. ЛОГИКА ПОИКА (Search Logic)
========================================================================== */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    if (!q) return items;
    return items.filter(({ id = '', ip = '', loc = '' }) => 
        [id, ip, loc].some(val => val.toString().toLowerCase().includes(q))
    );
};

/* ==========================================================================
   2. ИНИЦИАЛИЗАЦИЯ (Initialization)
========================================================================== */
export function initializeSearch() {
    const input = document.getElementById('universal-search');
    if (!input) return;

    let timeout;
    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('searchUpdated', { detail: e.target.value }));
        }, 150);
    });
}