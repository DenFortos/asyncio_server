// frontend/client_control/js/modules/features/screen_renderer.js

let jmuxer = null;
let isJpegMode = null;
let packetCount = 0;

const video = document.getElementById('desktopVideo');
const overlay = document.getElementById('desktopOverlay');

export function resetRenderer() {
    if (jmuxer) { jmuxer.destroy(); jmuxer = null; }
    if (video) {
        video.pause();
        video.src = "";
        video.style.display = 'none';
    }
    if (overlay) overlay.style.display = 'flex';
    isJpegMode = null;
    packetCount = 0;
}

export async function renderScreenRGBA(cleanPayload) {
    if (!cleanPayload || cleanPayload.byteLength < 10) return;
    const videoData = new Uint8Array(cleanPayload);

    // Определение формата один раз
    if (isJpegMode === null) {
        isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);
        console.log("🛠 [Renderer] Mode:", isJpegMode ? "MJPEG" : "H264");
    }

    // Инициализация JMuxer
    if (!isJpegMode && !jmuxer) {
        jmuxer = new window.JMuxer({
            node: 'desktopVideo',
            mode: 'video',
            fps: 60,
            flushingTime: 0,
            clearBuffer: true
        });
    }

    // Показ видео и скрытие оверлея
    if (video.style.display === 'none') {
        video.style.display = 'block';
        if (overlay) overlay.style.display = 'none';
    }

    if (!isJpegMode && jmuxer) {
        jmuxer.feed({ video: videoData });

        if (video.buffered.length > 0) {
            const bufferEnd = video.buffered.end(video.buffered.length - 1);
            const delta = bufferEnd - video.currentTime;

            if (video.paused) video.play().catch(() => {});

            // Синхронизация: Ускоряем при накоплении буфера > 150мс
            if (delta > 0.15 && delta < 1.0) {
                video.playbackRate = 1.1;
            } else if (delta >= 1.0) {
                video.currentTime = bufferEnd; // Жесткий прыжок при большом лаге
                video.playbackRate = 1.0;
            } else {
                video.playbackRate = 1.0;
            }
        }
    }
}