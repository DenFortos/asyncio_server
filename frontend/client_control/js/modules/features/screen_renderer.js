/* frontend/client_control/js/modules/features/screen_renderer.js */

export function renderScreenRGBA(payload) {
    const canvas = document.getElementById('desktopCanvas');
    const wrapper = document.getElementById('wrapper-desktop');

    // 1. Проверка наличия канваса и минимальной длины заголовка
    if (!canvas || payload.byteLength < 4) return;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const view = new DataView(payload);

    // 2. Читаем заголовок (W:2b, H:2b)
    const width = view.getUint16(0);
    const height = view.getUint16(2);

    // 3. Проверка целостности данных (RGBA = 4 байта на пиксель)
    const expectedLength = width * height * 4;
    if (payload.byteLength < (expectedLength + 4)) {
        console.warn("[Renderer] Пакет неполон или поврежден");
        return;
    }

    // 4. Создаем массив пикселей (пропускаем 4 байта заголовка)
    const pixels = new Uint8ClampedArray(payload, 4, expectedLength);

    // 5. Синхронизируем разрешение и UI
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;

        // Скрываем оверлей "No Desktop Data"
        const overlay = wrapper ? wrapper.querySelector('.stream-overlay') : null;
        if (overlay) overlay.style.display = 'none';
    }

    // 6. Отрисовка
    try {
        const imgData = new ImageData(pixels, width, height);
        ctx.putImageData(imgData, 0, 0);
    } catch (e) {
        console.error("[Renderer] Canvas Error:", e.message);
    }
}