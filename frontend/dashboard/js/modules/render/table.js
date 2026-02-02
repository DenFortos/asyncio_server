// js/modules/render/table.js

/**
 * Рендерит список клиентов в таблицу
 */
export function renderTable(clients) {
    const tbody = document.querySelector('#clients-list');
    if (!tbody) return;

    tbody.innerHTML = clients.map(c => {
        const isOnline = c.status === 'online';

        return `
            <tr class="client-row ${isOnline ? 'client-online' : 'client-offline'}" data-client-id="${c.id}">
                <td data-label="loc">
                    <span class="status-indicator ${isOnline ? 'status-online' : 'status-offline'}"></span>
                    ${c.loc || '??'}
                </td>
                <td data-label="user">${c.user || 'Anon'}</td>
                <td data-label="pc-name">${c.pc_name || 'N/A'}</td>
                <td data-label="last active">${c.last_active || 'N/A'}</td>
                <td data-label="ip">${c.ip || '0.0.0.0'}</td>
                <td data-label="active window" class="text-truncate">${c.activeWindow || 'Idle'}</td>
                <td data-label="id" class="client-id-cell">${c.id}</td>
            </tr>
        `;
    }).join('');
}