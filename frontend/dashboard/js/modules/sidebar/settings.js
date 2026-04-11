export const SettingsManager = {
    // Устанавливаем значения согласно твоему скриншоту
    defaults: { blur: 10, opacity: 0.1, intensity: 0.5 },

    init() {
        ['blur', 'opacity', 'intensity'].forEach(key => {
            const saved = localStorage.getItem(`app_${key}`);
            const val = saved !== null ? parseFloat(saved) : this.defaults[key];
            this.applySetting(key, key === 'blur' ? val : val * 100);
        });
    },

    render() {
        const container = document.querySelector('#section-settings .data-wrapper');
        if (!container) return;

        // Берем текущие значения для отображения в лейблах
        const b = localStorage.getItem('app_blur') || this.defaults.blur;
        const o = (localStorage.getItem('app_opacity') || this.defaults.opacity) * 100;
        const i = (localStorage.getItem('app_intensity') || this.defaults.intensity) * 100;

        container.innerHTML = `
            <div class="settings-grid">
                <div class="setting-card">
                    <h3>Visual Settings</h3>
                    <div class="setting-item"><span class="setting-label">Blur (${b}px)</span><input type="range" class="setting-range" data-key="blur" min="0" max="30" value="${b}"></div>
                    <div class="setting-item"><span class="setting-label">Opacity (${Math.round(o)}%)</span><input type="range" class="setting-range" data-key="opacity" min="10" max="100" value="${o}"></div>
                    <div class="setting-item"><span class="setting-label">Intensity (${Math.round(i)}%)</span><input type="range" class="setting-range" data-key="intensity" min="0" max="100" value="${i}"></div>
                    <button id="reset-settings" class="reset-btn">Reset</button>
                </div>
            </div>
        `;
        this.initEvents();
    },

    initEvents() {
        const container = document.querySelector('#section-settings .data-wrapper');
        if (!container) return;

        container.addEventListener('input', (e) => {
            if (!e.target.classList.contains('setting-range')) return;
            
            const key = e.target.dataset.key;
            const val = e.target.value;
            
            this.applySetting(key, val);
            
            const label = e.target.previousElementSibling;
            const baseText = label.textContent.split('(')[0];
            const unit = key === 'blur' ? 'px' : '%';
            label.textContent = `${baseText}(${val}${unit})`;
        });

        document.getElementById('reset-settings').addEventListener('click', () => {
            Object.entries(this.defaults).forEach(([k, v]) => this.applySetting(k, k === 'blur' ? v : v * 100));
            this.render();
        });
    },

    applySetting(key, val) {
        const root = document.documentElement.style;
        const num = parseFloat(val);
        const norm = key === 'blur' ? num : num / 100;
        
        const cssVar = key === 'blur' ? '--blur-amount' : (key === 'opacity' ? '--glass-opacity' : '--btn-intensity');
        root.setProperty(cssVar, key === 'blur' ? `${norm}px` : norm);
        localStorage.setItem(`app_${key}`, norm);
    }
};