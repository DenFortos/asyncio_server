// frontend/client_control/js/modules/features/screen_renderer.js

/* ==========================================================================
   1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ЭЛЕМЕНТЫ (State & DOM)
========================================================================== */

let jmuxer = null;
let isJpegMode = null;

const video = document.getElementById('desktopVideo');
const canvas = document.getElementById('desktopCanvas'); // Добавлено для синхронизации управления
const overlay = document.getElementById('desktopOverlay');

/* ==========================================================================
   2. УПРАВЛЕНИЕ ЖИЗНЕННЫМ ЦИКЛОМ (Lifecycle)
========================================================================== */

export function resetRenderer() {
    console.log("🧹 [Renderer] Full Cleanup...");

    if (jmuxer) {
        try { jmuxer.destroy(); } catch (e) {}
        jmuxer = null;
    }

    if (video) {
        video.pause();
        // СБРОС ДЕКОДЕРА: Очищаем источник и форсируем полную перезагрузку элемента
        video.src = "";
        video.removeAttribute('src');
        video.load();

        video.style.display = 'none';
    }

    if (overlay) overlay.classList.remove('hidden');

    // Сбрасываем флаг режима, чтобы при следующем старте заново определить H264/MJPEG
    isJpegMode = null;
}

/* ==========================================================================
   3. ЯДРО РЕНДЕРИНГА (Rendering Engine)
========================================================================== */

export async function renderScreenRGBA(cleanPayload) {
    if (!cleanPayload || cleanPayload.byteLength < 10) return;
    const videoData = new Uint8Array(cleanPayload);

    // Определение формата (MJPEG vs H264)
    if (isJpegMode === null) {
        isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);
        console.log("🛠 [Renderer] Mode Detected:", isJpegMode ? "MJPEG" : "H264");
    }

    // Инициализация JMuxer (с улучшенными параметрами для живого потока)
    if (!isJpegMode && !jmuxer) {
        jmuxer = new window.JMuxer({
            node: video,
            mode: 'video',
            fps: 60,
            flushingTime: 10,    // Даем 10мс на сборку кадров (убирает микро-дергания)
            clearBuffer: true,
            onError: function(err) {
                console.error("❌ [JMuxer Error]:", err);
                resetRenderer();
            }
        });
    }

    // ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ
    if (video.style.display === 'none' || video.style.display === '') {
        video.style.display = 'block';
        if (overlay) overlay.classList.add('hidden');
    }

    // Принудительный старт, если видео встало (важно для обхода блокировок браузера)
    if (video.paused && video.readyState >= 1) {
        video.play().catch(() => {});
    }

    /* ==========================================================================
       4. СИНХРОНИЗАЦИЯ РАЗМЕРОВ (Canvas Sync)
       (Без изменений)
    ========================================================================== */
    if (video.videoWidth > 0 && canvas) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log(`[Renderer] Sync: Canvas size set to ${canvas.width}x${canvas.height}`);
        }
    }

    /* ==========================================================================
       5. ОБРАБОТКА ПОТОКА (Stream Handling)
    ========================================================================== */

    if (!isJpegMode && jmuxer) {
        jmuxer.feed({ video: videoData });

        if (video.paused && video.readyState >= 1) {
            video.play().catch(() => {});
        }

        if (video.buffered.length > 0) {
            const bufferEnd = video.buffered.end(video.buffered.length - 1);
            const delta = bufferEnd - video.currentTime;

            // Вместо постоянной подстройки скорости, делаем "мягкий прыжок",
            // только если накопилось больше 0.3 сек задержки.
            if (delta > 0.3) {
                video.currentTime = bufferEnd - 0.05;
            }

            // Держим скорость всегда 1.0, чтобы не было визуальных искажений
            if (video.playbackRate !== 1.0) {
                video.playbackRate = 1.0;
            }
        }
    }
}