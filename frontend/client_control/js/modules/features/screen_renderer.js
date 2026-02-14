/* frontend/client_control/js/modules/features/screen_renderer.js */

export function renderScreenRGBA(payload) {
    const canvas = document.getElementById('screen-canvas'); // Должен быть в HTML
    const placeholder = document.getElementById('desktop-placeholder');

    if (!canvas || payload.byteLength < 4) return;

    const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    });

    const view = new DataView(payload);

    // Читаем заголовок нашего протокола (Width 2b, Height 2b)
    const width = view.getUint16(0);
    const height = view.getUint16(2);

    // Берем пиксели (пропускаем первые 4 байта заголовка)
    const pixels = new Uint8ClampedArray(payload, 4);

    // Ресайз канваса под поток
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