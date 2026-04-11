export const SettingsManager = {
    defaults: { blur: 16, opacity: 0.4, intensity: 0.2 },

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

        const b = localStorage.getItem('app_blur') || this.defaults.blur;
        const o = (localStorage.getItem('app_opacity') || this.defaults.opacity) * 100;
        const i = (localStorage.getItem('app_intensity') || this.defaults.intensity) * 100;

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
            </div>
        `;
        this.initEvents();
    },

    createSlider(key, label, val, unit, max) {
        return `
            <div class="control-group">
                <div class="control-header">
                    <span class="label-text">${label}</span>
                    <span class="label-value" id="${key}-val">${Math.round(val)}${unit}</span>
                </div>
                <input type="range" class="setting-range" data-key="${key}" min="0" max="${max}" value="${val}">
            </div>
        `;
    },

    initEvents() {
        const container = document.querySelector('.settings-view');
        if (!container) return;

        container.addEventListener('input', (e) => {
            if (!e.target.classList.contains('setting-range')) return;
            const key = e.target.dataset.key;
            const val = e.target.value;
            this.applySetting(key, val);
            
            const valDisplay = document.getElementById(`${key}-val`);
            if (valDisplay) valDisplay.textContent = `${val}${key === 'blur' ? 'px' : '%'}`;
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
        
        const variableMap = {
            'blur': '--blur-amount',
            'opacity': '--glass-opacity',
            'intensity': '--btn-intensity'
        };

        root.setProperty(variableMap[key], key === 'blur' ? `${norm}px` : norm);
        localStorage.setItem(`app_${key}`, norm);
    }
};