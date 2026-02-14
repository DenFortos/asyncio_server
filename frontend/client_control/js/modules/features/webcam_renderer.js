/* frontend/client_control/js/modules/features/webcam_renderer.js */

/**
 * Рендеринг JPEG потока (например, Веб-камера)
 */
window.renderStream = (imgId, payload, placeholderId) => {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);

    if (!img || !payload) return;

    const blob = new Blob([payload], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const oldUrl = img.src;

    img.src = url;

    if (img.style.display === 'none') {
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }

    // Освобождаем память
    if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
};

window.clearStreamUI = (imgId, placeholderId) => {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);
    if (img) { img.style.display = 'none'; img.src = ''; }
    if (placeholder) placeholder.style.display = 'block';
};