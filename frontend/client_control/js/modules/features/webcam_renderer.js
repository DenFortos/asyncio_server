/* frontend/client_control/js/modules/ui/render.js */

/**
 * Универсальный рендеринг потока (изображений)
 */
window.renderStream = (imgId, payload, containerSelector, placeholderId) => {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);

    if (!img || !payload) return;

    // Конвертируем бинарные данные в URL
    const blob = new Blob([payload], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    const oldUrl = img.src;
    img.src = url;

    // Скрываем заглушку и показываем поток при первом кадре
    if (img.style.display === 'none') {
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }

    // Освобождаем память от старого кадра
    if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
};

/**
 * Очистка UI для любого типа потока
 */
window.clearStreamUI = (imgId, placeholderId) => {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);

    if (img) {
        img.style.display = 'none';
        img.src = '';
    }
    if (placeholder) placeholder.style.display = 'block';
};