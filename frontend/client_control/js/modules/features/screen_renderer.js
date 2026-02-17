/* frontend/client_control/js/modules/features/screen_renderer.js */

let isProcessing = false; // Флаг для предотвращения накопления очереди кадров

export async function renderScreenRGBA(payload) {
    // Если мы еще заняты отрисовкой предыдущего куска — дропаем текущий.
    // Это критично для предотвращения Input Lag (лучше пропустить кадр, чем опоздать на 200мс)
    if (isProcessing) return;

    const canvas = document.getElementById('desktopCanvas');
    if (!canvas || payload.byteLength < 8) return;

    isProcessing = true;

    const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true, // Прямой вывод в буфер экрана
        preserveDrawingBuffer: true // Важно для диффов (чтобы не стирались старые части)
    });

    const view = new DataView(payload);
    const x = view.getUint16(0, false);
    const y = view.getUint16(2, false);
    const w = view.getUint16(4, false);
    const h = view.getUint16(6, false);

    try {
        // Извлекаем JPEG данные (смещение 8 байт)
        const jpegPart = payload.slice(8);
        const blob = new Blob([jpegPart], { type: 'image/jpeg' });

        // Создаем битмап. Это самая тяжелая часть, браузер делает её через GPU
        const bitmap = await createImageBitmap(blob, {
            premultiplyAlpha: 'none',
            colorSpaceConversion: 'none' // Отключаем лишние преобразования для скорости
        });

        // Подгон размера холста только при полном кадре (0,0)
        if (x === 0 && y === 0 && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
        }

        ctx.drawImage(bitmap, x, y);

        bitmap.close();
    } catch (e) {
        console.error("Render fail:", e);
    } finally {
        isProcessing = false; // Освобождаем "замок" для следующего кадра
    }
}