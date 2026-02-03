/**
 * Менеджер системных логов. Оптимизирован для высокой нагрузки.
 */
export class AlertsManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.logs = []; // Храним историю в памяти
        this.maxLogsInMemory = 500; // Сколько храним в массиве
        this.maxLogsInDOM = 100;    // Сколько реально отображаем в HTML
        this.activeFilters = new Set(['debug', 'info', 'warning', 'error', 'critical', 'exception']);

        this.init();
    }

    init() {
        this.createUI();
        this.setupListeners();
        window.alertsManager = this; // Глобальный доступ для WebSocket
    }

    createUI() {
        const levels = ['debug', 'info', 'warning', 'error', 'critical', 'exception'];
        this.container.innerHTML = `
            <div class="alerts-header">
                <div class="alerts-title">System Logs</div>
                <div class="alerts-controls">
                    ${levels.map(l => `<button class="filter-btn active" data-filter="${l}">${l.toUpperCase()}</button>`).join('')}
                    <button id="clear-logs">Clear</button>
                </div>
            </div>
            <div class="logs-grid"></div>
        `;
        this.grid = this.container.querySelector('.logs-grid');
    }

    setupListeners() {
        this.container.querySelector('.alerts-controls').onclick = (e) => {
            const btn = e.target;
            if (btn.id === 'clear-logs') return this.clear();

            const level = btn.dataset.filter;
            if (!level) return;

            btn.classList.toggle('active');
            this.activeFilters.has(level) ? this.activeFilters.delete(level) : this.activeFilters.add(level);
            this.syncDOM(); // Перерисовываем только при смене фильтров
        };
    }

    /**
     * Основной метод для добавления логов. Принимает строку или объект.
     */
    add(data) {
        // Гибкий парсинг: если пришла строка от сервера, разбиваем. Если объект — берем как есть.
        const log = typeof data === 'string' ? this.parseLogString(data) : data;

        this.logs.push(log);
        if (this.logs.length > this.maxLogsInMemory) this.logs.shift();

        // Если уровень лога включен в фильтрах — добавляем в конец списка
        if (this.activeFilters.has(log.level)) {
            this.grid.insertAdjacentHTML('beforeend', this.tpl(log));
            this.limitDOM();
            this.scrollToBottom();
        }
    }

    parseLogString(str) {
        const [time, level, ...msg] = str.includes(' | ') ? str.split(' | ') : [new Date().toLocaleTimeString(), 'info', str];
        return {
            timestamp: time.trim(),
            level: level.trim().toLowerCase(),
            message: msg.join(' | ').trim()
        };
    }

    tpl(log) {
        const icons = { debug: 'fa-bug', info: 'fa-info-circle', warning: 'fa-exclamation-triangle', error: 'fa-exclamation-circle', critical: 'fa-fire', exception: 'fa-skull' };
        return `
            <div class="log-item ${log.level}">
                <span class="log-time">[${log.timestamp}]</span>
                <span class="log-icon"><i class="fas ${icons[log.level] || 'fa-bell'}"></i></span>
                <span class="log-msg">${log.message}</span>
            </div>`;
    }

    limitDOM() {
        while (this.grid.children.length > this.maxLogsInDOM) {
            this.grid.removeChild(this.grid.firstChild);
        }
    }

    syncDOM() {
        this.grid.innerHTML = this.logs
            .filter(l => this.activeFilters.has(l.level))
            .slice(-this.maxLogsInDOM)
            .map(l => this.tpl(l))
            .join('');
        this.scrollToBottom();
    }

    clear() {
        this.logs = [];
        this.grid.innerHTML = '';
    }

    scrollToBottom() {
        this.grid.scrollTop = this.grid.scrollHeight;
    }
}