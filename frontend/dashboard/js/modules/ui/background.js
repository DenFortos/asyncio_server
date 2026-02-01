/** Применяет фон и сохраняет выбор */
export const setBackground = (path) => {
    document.body.style.backgroundImage = `url(${path})`;
    localStorage.setItem('selectedBackground', path);
};

/** Управление модальным окном выбора фона */
export function initializeBackgroundUI() {
    const modal = document.getElementById('bgModal');
    if (!modal) return;

    // Групповой обработчик кликов (Делегирование)
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Открытие
        if (target.closest('#bgButton')) return modal.style.display = 'block';

        // Закрытие (кнопка закрытия ИЛИ клик по серому фону)
        if (target.closest('#closeModal') || target === modal) {
            return modal.style.display = 'none';
        }

        // Выбор фона
        const option = target.closest('.bg-option');
        if (option) {
            const bgPath = `../images/${option.dataset.bg}.jpg`;
            setBackground(bgPath);
            modal.style.display = 'none';
        }
    });
}

// 1. Мгновенное применение фона (без ожидания DOM)
const saved = localStorage.getItem('selectedBackground');
if (saved) document.body.style.backgroundImage = `url(${saved})`;

// 2. Инициализация UI
document.addEventListener('DOMContentLoaded', initializeBackgroundUI);