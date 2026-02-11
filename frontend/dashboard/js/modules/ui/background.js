// frontend/dashboard/js/modules/ui/background.js

const BG_LIST = ['bg1', 'bg2', 'bg3', 'bg4']; // Имена твоих файлов в папке images (без .jpg)

export const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

export function initializeBackgroundUI() {
    const modal = document.getElementById('bgModal');
    const grid = modal?.querySelector('.bg-options-grid');
    const openBtn = document.getElementById('bgButton');

    if (!modal || !grid) {
        console.warn("⚠️ [BG] Элементы модалки фона не найдены в DOM");
        return;
    }

    // 1. Генерируем список фонов, если сетка пуста
    if (grid.children.length === 0) {
        grid.innerHTML = BG_LIST.map(name => `
            <div class="bg-option" data-bg="${name}">
                <img src="../images/${name}.jpg" alt="${name}" loading="lazy">
                <span>Theme ${name.replace('bg', '')}</span>
            </div>
        `).join('');
    }

    // 2. Делегирование кликов
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Открытие
        if (target.closest('#bgButton')) {
            console.log("🖼️ [BG] Открываю окно выбора фона");
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // Используем flex для центрирования контента
            return;
        }

        // Закрытие (крестик или клик мимо модалки)
        if (target.closest('.close-modal') || target === modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            return;
        }

        // Выбор фона
        const option = target.closest('.bg-option');
        if (option) {
            const bgName = option.dataset.bg;
            const bgPath = `../images/${bgName}.jpg`;
            console.log("🎨 [BG] Устанавливаю фон:", bgPath);
            setBackground(bgPath);
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });
}

// Применяем сохраненный фон мгновенно
const saved = localStorage.getItem('selectedBackground');
if (saved) {
    document.body.style.backgroundImage = `url(${saved})`;
}