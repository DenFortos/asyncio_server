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
    if (jmuxer) { jmuxer.destroy(); jmuxer = null; }
    if (video) {
        video.pause();
        video.src = "";
        video.style.display = 'none';
    }
    // Используем класс hidden вместо прямого style.display
    if (overlay) overlay.classList.remove('hidden');

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
        console.log("🛠 [Renderer] Mode:", isJpegMode ? "MJPEG" : "H264");
    }

    // Инициализация JMuxer для H264
    if (!isJpegMode && !jmuxer) {
        jmuxer = new window.JMuxer({
            node: 'desktopVideo',
            mode: 'video',
            fps: 60,
            flushingTime: 0,
            clearBuffer: true
        });
    }

    // ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ (Синхронизировано с CSS)
    if (video.style.display === 'none' || video.style.display === '') {
        video.style.display = 'block';
        if (overlay) overlay.classList.add('hidden'); // Скрываем заглушку через класс
    }

    /* ==========================================================================
       4. СИНХРОНИЗАЦИЯ РАЗМЕРОВ (Canvas Sync)
       Важно для корректных координат мыши InputForge
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

        if (video.buffered.length > 0) {
            const bufferEnd = video.buffered.end(video.buffered.length - 1);
            const delta = bufferEnd - video.currentTime;

            if (video.paused) video.play().catch(() => {});

            // WATCHDOG: Минимизация задержки
            if (delta > 0.15 && delta < 1.0) {
                video.playbackRate = 1.08; // Чуть быстрее, чтобы догнать поток
            } else if (delta >= 1.0) {
                video.currentTime = bufferEnd; // Прыжок при большом лаге
                video.playbackRate = 1.0;
            } else {
                video.playbackRate = 1.0;
            }
        }
    }
}