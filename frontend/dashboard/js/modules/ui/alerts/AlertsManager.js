// js/modules/ui/alerts/AlertsManager.js

/**
 * Менеджер для отображения, фильтрации и хранения системных логов.
 * Класс инкапсулирует всю логику UI и данных для вкладки "Alerts".
 */
export class AlertsManager { // ⬅️ Убеждаемся, что класс экспортирован
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`AlertsManager: Container with id "${containerId}" not found.`);
      return;
    }
    this.logs = [];
    this.maxLogs = 1000; // Максимальное количество логов в памяти
    this.maxLogsInDom = 200; // Максимальное количество логов в DOM для производительности
    this.activeFilters = ['debug', 'info', 'warning', 'error', 'critical', 'exception'];
    this.init();
  }

  init() {
    this.createUI();
    this.setupEventListeners();
    this.addTestLogs();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="alerts-header">
        <div class="alerts-title">Logs</div>
        <div class="alerts-controls">
          <button class="filter-btn active" data-filter="debug">DEBUG</button>
          <button class="filter-btn active" data-filter="info">INFO</button>
          <button class="filter-btn active" data-filter="warning">WARNING</button>
          <button class="filter-btn active" data-filter="error">ERROR</button>
          <button class="filter-btn active" data-filter="critical">CRITICAL</button>
          <button class="filter-btn active" data-filter="exception">EXCEPTION</button>
          <button class="clear-logs-btn" id="clear-logs">Clear</button>
        </div>
      </div>
      <div class="logs-grid"></div>
    `;
    // Сохраняем ссылку на контейнер для логов
    this.grid = this.container.querySelector('.logs-grid');
  }

  setupEventListeners() {
    const controls = this.container.querySelector('.alerts-controls');

    controls.querySelectorAll('.filter-btn').forEach(btn => {
      // Использование стрелочной функции обеспечивает правильный контекст this
      btn.addEventListener('click', (e) => this.toggleFilter(e.target.dataset.filter));
    });

    controls.querySelector('#clear-logs').addEventListener('click', () => this.clearLogs());
  }

  /**
   * Добавляет лог. Этот метод вы будете вызывать для сообщений из WebSocket.
   * @param {string} logLine - Строка лога
   */
  addLog(logLine) {
    const match = logLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (\w+)\s*\| (.+)$/);
    let log;

    if (match) {
      const [, timestamp, level, message] = match;
      log = {
        timestamp,
        level: level.trim().toLowerCase(),
        message
      };
    } else {
      // Для строк без стандартного формата
      log = {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 'info', // Уровень по умолчанию
        message: logLine
      };
    }

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Удаляем самый старый лог из массива
    }

    // Рендерим лог в DOM, только если он проходит текущие фильтры
    if (this.activeFilters.includes(log.level)) {
      const logElement = this._createLogElement(log);
      this.grid.appendChild(logElement);

      // Ограничиваем количество элементов в DOM для производительности
      while (this.grid.children.length > this.maxLogsInDom) {
        this.grid.removeChild(this.grid.firstChild);
      }

      this.scrollToBottom();
    }
  }

  /**
   * Создает HTML-элемент для одного лога (приватный метод)
   * @param {object} log - Объект лога
   * @returns {HTMLElement}
   */
  _createLogElement(log) {
    const logElement = document.createElement('div');
    logElement.className = `log-item ${log.level}`;

    // Форматируем строку для красивого вывода
    const formattedLine = `${log.timestamp} | ${log.level.toUpperCase().padEnd(9)} | ${log.message}`;

    logElement.innerHTML = `
      <div class="log-icon"><i class="${this._getIconClass(log.level)}"></i></div>
      <div class="log-content">${formattedLine}</div>
    `;
    return logElement;
  }

  _getIconClass(level) {
    const icons = {
      debug: 'fas fa-bug',
      info: 'fas fa-info-circle',
      warning: 'fas fa-exclamation-triangle',
      error: 'fas fa-exclamation-circle',
      critical: 'fas fa-fire',
      exception: 'fas fa-skull'
    };
    return icons[level] || 'fas fa-bell';
  }

  toggleFilter(level) {
    const btn = this.container.querySelector(`[data-filter="${level}"]`);
    btn.classList.toggle('active');

    if (this.activeFilters.includes(level)) {
      this.activeFilters = this.activeFilters.filter(f => f !== level);
    } else {
      this.activeFilters.push(level);
    }

    this._filterLogs();
  }

  /**
   * Полностью перерисовывает логи в соответствии с активными фильтрами.
   */
  _filterLogs() {
    this.grid.innerHTML = ''; // Очищаем контейнер

    const filteredLogs = this.logs.filter(log => this.activeFilters.includes(log.level));

    // Берем только последние N логов для отображения
    const logsToRender = filteredLogs.slice(-this.maxLogsInDom);

    logsToRender.forEach(log => {
      const logElement = this._createLogElement(log);
      this.grid.appendChild(logElement);
    });

    this.scrollToBottom();
  }

  clearLogs() {
    this.logs = [];
    this.grid.innerHTML = '';
  }

  scrollToBottom() {
    // Контейнер, который имеет overflow: auto - это .alerts-container
    const scrollableContainer = this.container.closest('.alerts-container');
    if (scrollableContainer) {
      scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
    }
  }

  addTestLogs() {
    const testLogs = [
      '2025-10-06 02:47:41 | INFO      | [+] Worker Process-8 started and connected to tcp://127.0.0.1:50000',
      '2025-10-06 02:47:42 | DEBUG     | Database connection established',
      '2025-10-06 02:47:43 | WARNING   | Memory usage 85%',
      '2025-10-06 02:47:44 | ERROR     | Connection timeout to client 192.168.1.100',
      '2025-10-06 02:47:45 | CRITICAL  | Database connection lost',
      '2025-10-06 02:47:46 | EXCEPTION | Unhandled exception in worker process',
      '2025-10-06 02:47:47 | INFO      | New client connected: WIN-PC',
      '2025-10-06 02:47:48 | DEBUG     | File transfer initiated',
      '2025-10-06 02:47:49 | WARNING   | High CPU usage detected',
      '2025-10-06 02:47:50 | ERROR     | Failed to execute command: access denied',
      '2025-10-06 02:47:51 | CRITICAL  | Security breach detected'
    ];

    testLogs.forEach((log, index) => {
      setTimeout(() => {
        this.addLog(log);
      }, index * 300); // Имитация поступления логов в реальном времени
    });
  }
}