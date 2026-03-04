// frontend/client_control/js/modules/features/screen_renderer.js

let jmuxer = null;
let isJpegMode = null;
let visibilityTimeout = null;
const VISIBILITY_TIMEOUT = 120000; // 2 минуты

const video = document.getElementById('desktopVideo');
const canvas = document.getElementById('desktopCanvas');
const overlay = document.getElementById('desktopOverlay');
const streamBtn = document.getElementById('btn-desktop-stream');

/* ==========================================================================
   1. ДЕТЕКТОР ВИДИМОСТИ ВКЛАДКИ
========================================================================== */
function handleVisibilityChange() {
    if (document.hidden) {
        console.log("🌙 [Renderer] Вкладка скрыта, таймаут 2 мин...");
        visibilityTimeout = setTimeout(() => {
            if (streamBtn && streamBtn.classList.contains('active')) {
                console.log("⏸ [Renderer] Авто-пауза стрима (вкладка в фоне > 2 мин)");

                // ← НОВОЕ: Сброс AppState в синхрон с UI
                if (window.AppState && window.AppState.desktop) {
                    window.AppState.desktop.observe = false;
                }

                // Отправляем stop_stream боту
                if (window.sendToBot) {
                    window.sendToBot("ScreenWatch", "stop_stream");
                }

                // Обновляем UI
                streamBtn.classList.remove('active');
                streamBtn.dataset.paused = 'true';
                streamBtn.title = 'Стрим на паузе (вкладка в фоне). Кликни для запуска';
            }
        }, VISIBILITY_TIMEOUT);
    } else {
        console.log("☀️ [Renderer] Вкладка активна");
        clearTimeout(visibilityTimeout);
        visibilityTimeout = null;

        if (streamBtn && streamBtn.dataset.paused === 'true') {
            streamBtn.dataset.paused = 'false';
            streamBtn.title = 'Start/Stop Stream';
        }
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

/* ==========================================================================
   2. УПРАВЛЕНИЕ ЖИЗНЕННЫМ ЦИКЛОМ
========================================================================== */
export function resetRenderer() {
    console.log("🧹 [Renderer] Full Cleanup...");

    if (jmuxer) {
        try { jmuxer.destroy(); } catch (e) {}
        jmuxer = null;
    }

    if (video) {
        video.pause();
        video.src = "";
        video.removeAttribute('src');
        video.load();
        video.style.display = 'none';
    }

    if (overlay) overlay.classList.remove('hidden');
    isJpegMode = null;
}

/* ==========================================================================
   3. ЯДРО РЕНДЕРИНГА
========================================================================== */
export async function renderScreenRGBA(cleanPayload) {
    if (document.hidden) return;

    if (!cleanPayload || cleanPayload.byteLength < 10) return;
    const videoData = new Uint8Array(cleanPayload);

    if (isJpegMode === null) {
        isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);
        console.log("🛠 [Renderer] Mode Detected:", isJpegMode ? "MJPEG" : "H264");
    }

    if (!isJpegMode && !jmuxer) {
        jmuxer = new window.JMuxer({
            node: video,
            mode: 'video',
            fps: 60,
            flushingTime: 10,
            clearBuffer: true,
            onError: function(err) {
                console.error("❌ [JMuxer Error]:", err);
                resetRenderer();
            }
        });
    }

    if (video.style.display === 'none' || video.style.display === '') {
        video.style.display = 'block';
        if (overlay) overlay.classList.add('hidden');
    }

    if (video.paused && video.readyState >= 1) {
        video.play().catch(() => {});
    }

    if (video.videoWidth > 0 && canvas) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log(`[Renderer] Sync: Canvas size set to ${canvas.width}x${canvas.height}`);
        }
    }

    if (!isJpegMode && jmuxer) {
        jmuxer.feed({ video: videoData });

        if (video.paused && video.readyState >= 1) {
            video.play().catch(() => {});
        }

        if (video.buffered.length > 0) {
            const bufferEnd = video.buffered.end(video.buffered.length - 1);
            const delta = bufferEnd - video.currentTime;

            if (delta > 0.3) {
                video.currentTime = bufferEnd - 0.05;
            }

            if (video.playbackRate !== 1.0) {
                video.playbackRate = 1.0;
            }
        }
    }
}