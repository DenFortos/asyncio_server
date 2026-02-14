/* frontend/client_control/js/modules/features/screen_renderer.js */

export function renderScreenRGBA(payload) {
    const canvas = document.getElementById('screen-canvas');
    console.log("[Renderer] Attempting to render payload:", payload.byteLength);
    const placeholder = document.getElementById('desktop-placeholder');

    // Проверка: минимум 4 байта на заголовок (W:2, H:2)
    if (!canvas || payload.byteLength < 4) return;

    const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    });

    const view = new DataView(payload);

    // Читаем заголовок нашего протокола (Width 2b, Height 2b)
    const width = view.getUint16(0);
    const height = view.getUint16(2);

    // Создаем представление пикселей (пропускаем 4 байта заголовка)
    // Используем Uint8ClampedArray поверх существующего ArrayBuffer (zero-copy)
    const pixels = new Uint8ClampedArray(payload, 4);

    // Ресайз канваса, если разрешение изменилось
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        if (placeholder) placeholder.style.display = 'none';
        canvas.style.display = 'block';
    }

    try {
        const imgData = new ImageData(pixels, width, height);
        ctx.putImageData(imgData, 0, 0);
    } catch (e) {
        console.error("[Canvas] Render Error:", e);
    }
}