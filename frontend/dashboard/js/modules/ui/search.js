/* frontend/dashboard/js/modules/ui/search.js */
export const applySearchFilter = (items, query) => {
    const q = query?.toLowerCase().trim();
    return !q ? items : items.filter(({ id = '', ip = '', loc = '' }) => 
        [id, ip, loc].some(val => val.toString().toLowerCase().includes(q))
    );
};

export function initializeSearch() {
    const input = document.getElementById('universal-search');
    let timeout;
    
    input?.addEventListener('input', e => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('searchUpdated', { detail: e.target.value }));
        }, 150);
    });
}