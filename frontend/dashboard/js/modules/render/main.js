// js/modules/render/main.js

import { renderTable } from './table.js';
import { renderGrid } from './grid.js';

let isGridView = false;

/** Переключает вид и уведомляет систему */
export function toggleView() {
    isGridView = !isGridView;
    window.dispatchEvent(new CustomEvent('viewToggled', { detail: isGridView }));
    return isGridView;
}

/** Рендерит переданные данные в зависимости от текущего режима */
export function renderClients(clients) {
    const table = document.getElementById('table-view');
    const grid = document.getElementById('grid-view');
    if (!table || !grid) return;

    // Массив настроек для управления отображением
    const views = [
        { el: table, display: 'table', active: !isGridView, fn: renderTable },
        { el: grid, display: 'flex', active: isGridView, fn: renderGrid }
    ];

    views.forEach(v => {
        v.el.style.display = v.active ? v.display : 'none';
        if (v.active) v.fn(clients);
    });
}