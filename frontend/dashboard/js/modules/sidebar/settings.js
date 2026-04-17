// frontend\dashboard\js\modules\sidebar\settings.js
// Управление визуальными настройками приложения и сохранение их в localStorage
export const SettingsManager = {
    defaults: { blur: 16, opacity: 0.4, intensity: 0.2 },

    // Инициализация настроек при загрузке: чтение из памяти или установка дефолтов
    init() {
        Object.keys(this.defaults).forEach(key => {
            const saved = localStorage.getItem(`app_${key}`);
            const val = saved !== null ? parseFloat(saved) : this.defaults[key];
            this.applySetting(key, key === 'blur' ? val : val * 100);
        });
    },

    // Отрисовка интерфейса настроек со слайдерами
    render() {
        const container = document.querySelector('#section-settings .data-wrapper');
        if (!container) return;

        const { blur: db, opacity: doP, intensity: di } = this.defaults;
        const b = localStorage.getItem('app_blur') || db;
        const o = (localStorage.getItem('app_opacity') || doP) * 100;
        const i = (localStorage.getItem('app_intensity') || di) * 100;

        container.innerHTML = `
            <div class="settings-view">
                <h2 class="section-title">Visual Settings</h2>
                <div class="compact-controls">
                    ${this.createSlider('blur', 'Blur Effect', b, 'px', 40)}
                    ${this.createSlider('opacity', 'Panel Opacity', o, '%', 100)}
                    ${this.createSlider('intensity', 'UI Intensity', i, '%', 100)}
                    <button id="reset-settings" class="reset-btn">
                        <i class="fas fa-redo-alt"></i> Reset to Default
                    </button>
                </div>
            </div>`;
        this.initEvents();
    },

    // Генерация HTML-кода для одного слайдера управления
    createSlider: (key, label, val, unit, max) => `
        <div class="control-group">
            <div class="control-header">
                <span class="label-text">${label}</span>
                <span class="label-value" id="${key}-val">${Math.round(val)}${unit}</span>
            </div>
            <input type="range" class="setting-range" data-key="${key}" min="0" max="${max}" value="${val}">
        </div>`,

    // Установка слушателей событий для изменения параметров и сброса
    initEvents() {
        const view = document.querySelector('.settings-view');
        const reset = document.getElementById('reset-settings');

        view?.addEventListener('input', ({ target }) => {
            if (!target.classList.contains('setting-range')) return;
            const { key } = target.dataset;
            const val = target.value;
            const display = document.getElementById(`${key}-val`);

            this.applySetting(key, val);
            display && (display.textContent = `${val}${key === 'blur' ? 'px' : '%'}`);
        });

        reset?.addEventListener('click', () => {
            Object.entries(this.defaults).forEach(([k, v]) => this.applySetting(k, k === 'blur' ? v : v * 100));
            this.render();
        });
    },

    // Применение настроек к CSS-переменным документа и сохранение
    applySetting(key, val) {
        const root = document.documentElement.style;
        const num = parseFloat(val);
        const norm = key === 'blur' ? num : num / 100;
        const vars = { blur: '--blur-amount', opacity: '--glass-opacity', intensity: '--btn-intensity' };

        root.setProperty(vars[key], key === 'blur' ? `${norm}px` : norm);
        localStorage.setItem(`app_${key}`, norm);
    }
};