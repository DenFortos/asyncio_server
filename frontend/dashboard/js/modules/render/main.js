// js/modules/render/main.js

import { renderTable } from './table.js';
import { renderGrid } from './grid.js';
// Удаляем import { getAllClients } из этого файла, чтобы он не вызывал данные без фильтров

// Локальное состояние для отслеживания текущего вида (по умолчанию - таблица)
let isGridView = false;

/**
 * Переключает внутреннее состояние вида (таблица/сетка).
 * Возвращает новое состояние.
 * @returns {boolean} Новое состояние isGridView.
 */
export function toggleView() {
    isGridView = !isGridView;
    // Оповещаем dashboard.js о необходимости обновить UI (кнопку) и вызвать рендер
    window.dispatchEvent(new CustomEvent('viewToggled', { detail: isGridView }));
    return isGridView;
}


/**
 * Основная функция рендера. Вызывает нужную функцию рендера в зависимости от состояния.
 * ВАЖНО: Принимает УЖЕ ОТФИЛЬТРОВАННЫЕ данные из dashboard.js.
 * @param {Array<Object>} clientsData - Отфильтрованный и отсортированный список клиентов.
 */
export function renderClients(clientsData) {
  const tableView = document.getElementById('table-view');
  const gridView = document.getElementById('grid-view');

  if (!tableView || !gridView) return;

  if (isGridView) {
    tableView.style.display = 'none';
    gridView.style.display = 'flex'; // Используем flex для сетки
    renderGrid(clientsData);
  } else {
    tableView.style.display = 'table';
    gridView.style.display = 'none';
    renderTable(clientsData);
  }
}

// Удалены все обработчики DOMContentLoaded и привязки к кнопке.