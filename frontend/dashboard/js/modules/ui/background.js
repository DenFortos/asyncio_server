// frontend/dashboard/js/modules/ui/background.js

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4'];

export const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

export function initializeBackgroundUI() {
    const modal = document.getElementById('bgModal');
    const grid = modal?.querySelector('.bg-options-grid');
    if (!modal || !grid) return;

    // 1. Генерация опций
    grid.innerHTML = BG_LIST.map(name => `
        <div class="bg-option" data-bg="../images/${name}.jpg">
            <img src="../images/${name}.jpg" alt="${name}" loading="lazy">
            <span>Theme ${name.slice(2)}</span>
        </div>
    `).join('');

    // 2. Единый обработчик кликов (Делегирование)
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Открытие
        if (target.closest('#bgButton')) {
            modal.classList.remove('hidden');
        }
        // Закрытие
        else if (target.closest('.close-modal') || target === modal) {
            modal.classList.add('hidden');
        }
        // Выбор фона
        else if (target.closest('.bg-option')) {
            const path = target.closest('.bg-option').dataset.bg;
            setBackground(path);
            modal.classList.add('hidden');
        }
    });
}

// Мгновенное применение фона при загрузке скрипта
const saved = localStorage.getItem('selectedBackground');
if (saved) document.body.style.backgroundImage = `url(${saved})`;