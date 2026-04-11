/* frontend/dashboard/js/modules/sidebar/settings.js */

export const SettingsManager = {
    // Дефолтные настройки
    defaults: {
        blur: 10,
        opacity: 0.4
    },

    render() {
        const container = document.querySelector('#section-settings .data-wrapper');
        if (!container) return;

        const savedBlur = localStorage.getItem('app_blur') || this.defaults.blur;
        const savedOpacity = localStorage.getItem('app_opacity') || this.defaults.opacity;

        container.innerHTML = `
            <div class="settings-grid">
                <div class="setting-card">
                    <h3>Visual Settings</h3>
                    <div class="setting-item">
                        <span class="setting-label">Blur Effect (${savedBlur}px)</span>
                        <input type="range" class="setting-range" data-key="blur" min="0" max="30" value="${savedBlur}">
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Opacity (${Math.round(savedOpacity * 100)}%)</span>
                        <input type="range" class="setting-range" data-key="opacity" min="10" max="90" value="${savedOpacity * 100}">
                    </div>
                    <button id="reset-settings" class="bg-btn" style="margin-top:10px;">Reset to Default</button>
                </div>
            </div>
        `;
        this.initEvents();
    },

    initEvents() {
        // Слушаем изменение ползунков
        document.querySelectorAll('.setting-range').forEach(input => {
            input.addEventListener('input', (e) => {
                const key = e.target.dataset.key;
                const val = e.target.value;
                this.applySetting(key, val);
            });
        });

        // Сброс
        document.getElementById('reset-settings').addEventListener('click', () => {
            this.applySetting('blur', this.defaults.blur);
            this.applySetting('opacity', this.defaults.opacity);
            this.render(); // Перерендерим, чтобы обновить значения в инпутах
        });
    },

    applySetting(key, value) {
        const root = document.documentElement.style;
        if (key === 'blur') {
            root.setProperty('--glass-blur', `${value}px`);
            localStorage.setItem('app_blur', value);
        } else if (key === 'opacity') {
            root.setProperty('--glass-opacity', `${value / 100}`);
            localStorage.setItem('app_opacity', value / 100);
        }
    }
};