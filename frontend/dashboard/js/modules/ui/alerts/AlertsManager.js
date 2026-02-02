/**
 * Менеджер системных логов.
 */
export class AlertsManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.logs = [];
    this.maxLogs = 500;
    this.activeFilters = new Set(['debug', 'info', 'warning', 'error', 'critical', 'exception']);

    this.init();
  }

  init() {
    this.createUI();
    this.setupEventListeners();
    this.addTestLogs();
  }

  createUI() {
    const levels = ['debug', 'info', 'warning', 'error', 'critical', 'exception'];
    this.container.innerHTML = `
      <div class="alerts-header">
        <div class="alerts-title">System Logs</div>
        <div class="alerts-controls">
          ${levels.map(l => `<button class="filter-btn active" data-filter="${l}">${l.toUpperCase()}</button>`).join('')}
          <button class="clear-logs-btn" id="clear-logs">Clear</button>
        </div>
      </div>
      <div class="logs-grid"></div>
    `;
    this.grid = this.container.querySelector('.logs-grid');
  }

  setupEventListeners() {
    this.container.querySelector('.alerts-controls').onclick = (e) => {
      const btn = e.target;
      if (btn.id === 'clear-logs') return this.clearLogs();

      const level = btn.dataset.filter;
      if (!level) return;

      btn.classList.toggle('active');
      this.activeFilters.has(level) ? this.activeFilters.delete(level) : this.activeFilters.add(level);
      this.render();
    };
  }

  addLog(logLine) {
    // Парсим строку: "Дата | Уровень | Сообщение"
    const parts = logLine.split(' | ');
    const log = parts.length === 3 ? {
      timestamp: parts[0],
      level: parts[1].trim().toLowerCase(),
      message: parts[2]
    } : {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: logLine
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    if (this.activeFilters.has(log.level)) {
      this.grid.insertAdjacentHTML('beforeend', this._tpl(log));
      this._limitDOM();
      this.scrollToBottom();
    }
  }

  _tpl(log) {
    const icons = { debug: 'fa-bug', info: 'fa-info-circle', warning: 'fa-exclamation-triangle', error: 'fa-exclamation-circle', critical: 'fa-fire', exception: 'fa-skull' };
    const icon = icons[log.level] || 'fa-bell';
    const formatted = `${log.timestamp} | ${log.level.toUpperCase().padEnd(9)} | ${log.message}`;

    return `
      <div class="log-item ${log.level}">
        <div class="log-icon"><i class="fas ${icon}"></i></div>
        <div class="log-content">${formatted}</div>
      </div>`;
  }

  _limitDOM() {
    while (this.grid.children.length > 100) this.grid.removeChild(this.grid.firstChild);
  }

  render() {
    this.grid.innerHTML = this.logs
      .filter(l => this.activeFilters.has(l.level))
      .slice(-100)
      .map(l => this._tpl(l))
      .join('');
    this.scrollToBottom();
  }

  clearLogs() {
    this.logs = [];
    this.grid.innerHTML = '';
  }

  scrollToBottom() {
    const parent = this.container.closest('.alerts-container') || this.grid;
    parent.scrollTop = parent.scrollHeight;
  }

  addTestLogs() {
    const levels = ['INFO', 'DEBUG', 'WARNING', 'ERROR', 'CRITICAL'];
    levels.forEach((l, i) => {
      setTimeout(() => this.addLog(`2026-02-01 12:00:0${i} | ${l} | Test system message ${i+1}`), i * 500);
    });
  }
}