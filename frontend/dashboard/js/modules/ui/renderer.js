// frontend/dashboard/js/modules/ui/renderer.js

const $ = (element_id) => document.getElementById(element_id);

/**
 * Преобразует двухбуквенный код страны в эмодзи флага.
 * [DATA_SCHEME]: String(2) -> Emoji
 */
const get_flag_emoji = (country_code) => {
    if (!country_code || country_code.length !== 2) {
        return "🏳️";
    }
    return country_code
        .toUpperCase()
        .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

let is_grid_view_enabled = false;
const MINIMUM_SKELETON_ROWS = 25;

export const Renderer = {
    getIsGridView: () => is_grid_view_enabled,

    /**
     * Точечное обновление данных в DOM без полной перерисовки.
     */
    patch(client_data) {
        const client_row_element = document.querySelector(`.client-row[data-client-id="${client_data.id}"]`);
        
        if (client_row_element) {
            if (client_data.status && !client_row_element.classList.contains(client_data.status)) {
                client_row_element.className = `client-row ${client_data.status}`;
                client_row_element.innerHTML = this._getRowTemplate(client_data);
            } else {
                const window_text_element = client_row_element.querySelector(".active-window-text");
                if (window_text_element) {
                    window_text_element.textContent = client_data.active_window || "—";
                }
                
                const last_active_element = client_row_element.querySelector(".last-active-cell");
                if (last_active_element) {
                    last_active_element.textContent = client_data.last_active;
                }
            }
        }

        const client_card_element = document.querySelector(`.client-card[data-client-id="${client_data.id}"]`);
        if (client_card_element && client_data.status) {
            client_card_element.className = `client-card ${client_data.status}`;
        }
    },

    /**
     * Переключение между табличным и плиточным интерфейсом.
     */
    toggleView() {
        is_grid_view_enabled = !is_grid_view_enabled;
        const toggle_button = $("toggleView");
        
        if (toggle_button) {
            toggle_button.innerHTML = is_grid_view_enabled 
                ? '<i class="fas fa-list"></i> <span>Table View</span>' 
                : '<i class="fas fa-th"></i> <span>Grid View</span>';
        }
        
        return is_grid_view_enabled;
    },

    /**
     * Генерация HTML структуры для строки таблицы.
     * Использует ключ 'location' (совместимость с SystemInfo).
     */
    _getRowTemplate: (client) => `
        <td>
            <div class="status-wrapper">
                <span class="status-dot-mini ${client.status}"></span> 
                ${get_flag_emoji(client.location || client.loc)}
            </div>
        </td>
        <td><span class="cell-content truncate">${client.user || "—"}</span></td>
        <td><span class="cell-content truncate">${client.pc_name || "—"}</span></td>
        <td><span class="cell-content truncate last-active-cell" style="color: var(--accent-color)">${client.last_active || "Just now"}</span></td>
        <td><span class="cell-content truncate">${client.ip || "—"}</span></td>
        <td><span class="cell-content truncate active-window-text" title="${client.active_window || ""}">${client.active_window || "—"}</span></td>
        <td><span class="cell-content truncate client-id-cell">${client.id}</span></td>`,

    _getSkeletonRow: () => `
        <tr class="skeleton-row">
            <td><div class="status-wrapper"><div class="skeleton-dot"></div></div></td>
            ${'<td><div class="skeleton-line"></div></td>'.repeat(6)}
        </tr>`,

    _getSkeletonCard: () => `
        <div class="client-card skeleton-card">
            <div class="bot-preview skeleton-pulse"></div>
            <div class="bot-card-body">
                <div class="skeleton-line" style="width: 80%; height: 12px; margin: 5px 0;"></div>
                <div class="skeleton-line" style="width: 50%; height: 10px; opacity: 0.5;"></div>
            </div>
        </div>`,

    /**
     * Основной рендер списка клиентов.
     */
    render(client_list) {
        const table_container = $("table-container");
        const grid_container = $("grid-view");
        
        if (!table_container || !grid_container) return;

        table_container.classList.toggle("hidden", is_grid_view_enabled);
        grid_container.classList.toggle("hidden", !is_grid_view_enabled);

        const display_list = is_grid_view_enabled 
            ? client_list.filter((client) => client.status === "online") 
            : client_list;

        is_grid_view_enabled 
            ? this.drawGrid(display_list, grid_container) 
            : this.drawTable(display_list);
    },

    /**
     * Отрисовка списка в виде таблицы.
     */
    drawTable(client_list) {
        const table_body = $("clients-list");
        if (!table_body) return;

        const rows_html = client_list
            .map((client) => `<tr class="client-row ${client.status}" data-client-id="${client.id}">${this._getRowTemplate(client)}</tr>`)
            .join("");
        
        const skeleton_count = Math.max(0, MINIMUM_SKELETON_ROWS - client_list.length);
        const skeletons_html = this._getSkeletonRow().repeat(skeleton_count);
        
        table_body.innerHTML = rows_html + skeletons_html;
    },

    /**
     * Отрисовка списка в виде сетки (Grid).
     */
    drawGrid(client_list, container_element) {
        const cards_html = client_list.map((client) => `
            <div class="client-card ${client.status}" data-client-id="${client.id}">
                <div class="bot-preview">
                    <img src="${client.lastPreview || ""}" 
                         id="prev-${client.id}" 
                         class="preview-img"
                         style="opacity: ${client.lastPreview ? 1 : 0}"
                         onerror="this.style.opacity='0';">
                </div>
                <div class="bot-card-body">
                    <div class="bot-info-row">
                        <span class="flag-emoji">${get_flag_emoji(client.location || client.loc)}</span>
                        <div class="bot-data-string">
                             <span>${client.ip || "0.0.0.0"}</span>
                             <span class="data-separator">|</span>
                             <span class="data-part-id">${client.id}</span>
                        </div>
                    </div>
                </div>
            </div>`).join("");

        const skeleton_count = Math.max(0, MINIMUM_SKELETON_ROWS - client_list.length);
        const skeletons_html = this._getSkeletonCard().repeat(skeleton_count);
        container_element.innerHTML = cards_html + skeletons_html;
    }
};