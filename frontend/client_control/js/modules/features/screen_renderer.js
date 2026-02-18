/* frontend/client_control/js/modules/features/screen_renderer.js */

let jmuxer = null;
let lastLogTime = 0;

export async function renderScreenRGBA(payload) {
    // 1. Проверяем наличие данных. Минимум 4 байта TS + хотя бы 1 байт видео
    if (payload.byteLength < 5) {
        console.warn("[RENDER] Слишком маленький пакет:", payload.byteLength);
        return;
    }

    const videoElement = document.getElementById('desktopVideo');
    const overlay = document.querySelector('#view-desktop .stream-overlay');

    // 2. Инициализируем JMuxer один раз при первом кадре
    if (!jmuxer) {
        videoElement.style.display = 'block';
        if (overlay) overlay.style.display = 'none';

        jmuxer = new JMuxer({
            node: 'desktopVideo',
            mode: 'video',
            fps: 30,
            flushingTime: 0,
            clearBuffer: true,
            debug: false // Поставь true, если хочешь видеть внутренние логи самой библиотеки
        });
        console.log("[RENDER] JMuxer initialized for H.264");
    }

    try {
        const view = new DataView(payload);

        // 3. Извлекаем таймстемп (первые 4 байта)
        const serverTs = view.getUint32(0, false);

        // Вычисляем задержку (необязательно, для теста)
        const now = Date.now() & 0xFFFFFFFF;
        const latency = now - serverTs;

        // 4. Извлекаем само видео (все что после 4-го байта)
        const videoPart = new Uint8Array(payload.slice(4));

        // 5. Логируем получение данных (не каждый кадр, чтобы не спамить, а раз в секунду)
        if (Date.now() - lastLogTime > 1000) {
            console.debug(`[RENDER] Поток идет. Размер видео-части: ${videoPart.length} байт. Задержка сети: ${latency}ms`);
            lastLogTime = Date.now();
        }

        // 6. Отправляем в плеер
        jmuxer.feed({
            video: videoPart
        });

    } catch (err) {
        console.error("[RENDER] Ошибка при обработке видео-пакета:", err);
    }
}