export class AlertsManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Alerts container not found:', containerId);
            return;
        }

        this.alerts = [];
        this.filteredAlerts = [];
        this.setupUI();
        this.loadSampleData();
    }

    setupUI() {
        // Очищаем контейнер и создаем интерфейс
        this.container.innerHTML = `
            <div class="alerts-header">
                <h3>Журнал событий</h3>
                <div class="alerts-actions">
                    <button class="alert-btn" id="clearAlerts">Очистить всё</button>
                    <button class="alert-btn" id="exportAlerts">Экспорт</button>
                </div>
            </div>
            <div class="alerts-search">
                <input type="text" id="alertsSearch" placeholder="Поиск по событиям...">
                <select id="alertsFilter">
                    <option value="all">Все типы</option>
                    <option value="connection">Подключения</option>
                    <option value="file">Файлы</option>
                    <option value="action">Действия</option>
                    <option value="error">Ошибки</option>
                </select>
            </div>
            <div class="alerts-grid" id="alerts-grid-content">
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('clearAlerts')?.addEventListener('click', () => this.clearAlerts());
        document.getElementById('exportAlerts')?.addEventListener('click', () => this.exportAlerts());
        document.getElementById('alertsSearch')?.addEventListener('input', () => this.filterAlerts());
        document.getElementById('alertsFilter')?.addEventListener('change', () => this.filterAlerts());
    }

    addAlert(type, content, clientId = null, clientIp = null) {
        const alert = {
            id: Date.now(),
            type,
            content,
            clientId,
            clientIp,
            timestamp: new Date().toLocaleString(),
            date: new Date()
        };

        this.alerts.unshift(alert); // Добавляем в начало
        this.filteredAlerts = [...this.alerts];
        this.renderAlerts();
    }

    filterAlerts() {
        const searchTerm = document.getElementById('alertsSearch')?.value.toLowerCase() || '';
        const filterType = document.getElementById('alertsFilter')?.value || 'all';

        this.filteredAlerts = this.alerts.filter(alert => {
            const matchesSearch = alert.content.toLowerCase().includes(searchTerm) ||
                                (alert.clientId && alert.clientId.toLowerCase().includes(searchTerm)) ||
                                (alert.clientIp && alert.clientIp.toLowerCase().includes(searchTerm));

            const matchesType = filterType === 'all' || alert.type === filterType;

            return matchesSearch && matchesType;
        });

        this.renderAlerts();
    }

    renderAlerts() {
        const grid = document.getElementById('alerts-grid-content');
        if (!grid) return;

        grid.innerHTML = '';

        if (this.filteredAlerts.length === 0) {
            grid.innerHTML = '<div class="no-alerts">Нет событий для отображения</div>';
            return;
        }

        this.filteredAlerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = 'alert-item';
            alertElement.innerHTML = `
                <div class="alert-header">
                    <span class="alert-type ${alert.type}">${alert.type}</span>
                    <span>${alert.timestamp}</span>
                </div>
                <div class="alert-content">${alert.content}</div>
                <div class="alert-meta">
                    <span class="alert-client">${alert.clientId || 'Система'}</span>
                    <span>${alert.clientIp || 'N/A'}</span>
                </div>
            `;
            grid.appendChild(alertElement);
        });
    }

    clearAlerts() {
        if (confirm('Вы действительно хотите очистить все уведомления?')) {
            this.alerts = [];
            this.filteredAlerts = [];
            this.renderAlerts();
        }
    }

    exportAlerts() {
        const csv = this.alerts.map(alert =>
            `"${alert.timestamp}","${alert.type}","${alert.content}","${alert.clientId || ''}","${alert.clientIp || ''}"`
        ).join('\n');

        const blob = new Blob([`timestamp,type,content,clientId,clientIp\n${csv}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alerts_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadSampleData() {
        // Примеры логов
        this.addAlert('connection', 'Новое подключение клиента', 'Client_001', '192.168.1.100');
        this.addAlert('file', 'Получен JSON файл info.json', 'Client_001', '192.168.1.100');
        this.addAlert('file', 'Получено 5 фото от клиента', 'Client_001', '192.168.1.100');
        this.addAlert('action', 'Файл info.json скачан пользователем', 'Client_001', '192.168.1.100');
        this.addAlert('action', 'Блок файлов удален', 'Client_001', '192.168.1.100');
        this.addAlert('connection', 'Клиент отключен', 'Client_001', '192.168.1.100');
    }

    // Методы для добавления разных типов событий
    logConnection(clientId, ip, connected = true) {
        const content = connected ? 'Новое подключение клиента' : 'Клиент отключен';
        this.addAlert('connection', content, clientId, ip);
    }

    logFile(clientId, ip, fileName, count = 1) {
        const content = count === 1 ? `Получен файл ${fileName}` : `Получено ${count} файлов`;
        this.addAlert('file', content, clientId, ip);
    }

    logAction(content, clientId = null, ip = null) {
        this.addAlert('action', content, clientId, ip);
    }

    logError(content, clientId = null, ip = null) {
        this.addAlert('error', content, clientId, ip);
    }

    show() {
        const container = this.container?.closest('.alerts-container');
        if (container) {
            container.classList.add('active');
        }
        return this;
    }

    hide() {
        const container = this.container?.closest('.alerts-container');
        if (container) {
            container.classList.remove('active');
        }
        return this;
    }
}