/* frontend/client_control/js/modules/features/screen_renderer.js */

export function renderScreenRGBA(payload) {
    const canvas = document.getElementById('desktopCanvas');
    if (!canvas || payload.byteLength < 4) return;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const view = new DataView(payload);

    // 1. Парсинг заголовка
    const width = view.getUint16(0);
    const height = view.getUint16(2);
    const dataSize = width * height * 4;

    if (payload.byteLength < (dataSize + 4)) return;

    // 2. Синхронизация размеров (Умный зум)
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;

        // Сброс стилей важен для того, чтобы CSS правил балом
        canvas.removeAttribute('style');

        const overlay = document.querySelector('#wrapper-desktop .stream-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // 3. Отрисовка
    const pixels = new Uint8ClampedArray(payload, 4, dataSize);
    ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
}

// В JS при клике на кнопку Fullscreen
const fsBtn = document.querySelector('.fullscreen-btn');
const appMain = document.querySelector('.app-main'); // Берем всё основное окно

fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        appMain.requestFullscreen(); // Разворачиваем всё, включая шапку
    } else {
        document.exitFullscreen();
    }
});

// Отслеживаем изменение режима для смены иконок
document.addEventListener('fullscreenchange', () => {
    const icon = fsBtn.querySelector('i');
    if (document.fullscreenElement) {
        icon.classList.replace('fa-expand', 'fa-compress');
    } else {
        icon.classList.replace('fa-compress', 'fa-expand');
    }
});