/* frontend/client_control/js/modules/features/screen_renderer.js */

let jmuxer = null;
let isJpegMode = null;
let packetCount = 0;

export function resetRenderer() {
    console.log("♻️ [Renderer] Сброс плеера");
    if (jmuxer) {
        try { jmuxer.destroy(); } catch (e) {}
        jmuxer = null;
    }
    const video = document.getElementById('desktopVideo');
    if (video) {
        video.pause();
        video.src = "";
        video.load();
        video.style.display = 'none';
        video.playbackRate = 1.0; // Сброс скорости
    }
    const overlay = document.getElementById('desktopOverlay');
    if (overlay) overlay.style.display = 'flex';
    isJpegMode = null;
    packetCount = 0;
}

export async function renderScreenRGBA(cleanPayload) {
    if (!cleanPayload || cleanPayload.byteLength < 10) return;

    const videoData = new Uint8Array(cleanPayload);
    packetCount++;

    const video = document.getElementById('desktopVideo');
    const overlay = document.getElementById('desktopOverlay');

    if (isJpegMode === null) {
        isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);
        console.log("🛠 [Renderer] Формат:", isJpegMode ? "MJPEG" : "H264");
    }

    if (!isJpegMode && !jmuxer) {
        if (!window.JMuxer) {
            console.error("❌ JMuxer не найден в window");
            return;
        }
        jmuxer = new window.JMuxer({
            node: 'desktopVideo',
            mode: 'video',
            fps: 60,
            flushingTime: 0,     // Мгновенный вывод без ожидания
            clearBuffer: true,
            onReady: () => console.log("✅ [JMuxer] Декодер готов"),
            onError: (err) => console.error("❌ [JMuxer Error]:", err)
        });
    }

    if (video && video.style.display === 'none') {
        video.style.display = 'block';
        if (overlay) overlay.style.display = 'none';
    }

    if (!isJpegMode && jmuxer) {
        // Контрольный HEX
        if (packetCount % 200 === 0 || packetCount < 3) {
            console.log(`🔍 [Check] Packet #${packetCount} HEX:`,
                Array.from(videoData.slice(0, 5)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        }

        jmuxer.feed({ video: videoData });

        // --- УМНАЯ СИНХРОНИЗАЦИЯ И ПЛАВНОСТЬ ---
        if (video && video.buffered.length > 0) {
            const bufferEnd = video.buffered.end(video.buffered.length - 1);
            const delta = bufferEnd - video.currentTime;

            // 1. Первичный запуск
            if (video.paused || video.currentTime === 0) {
                video.currentTime = bufferEnd;
                video.play().catch(() => {});
                return;
            }

            // 2. Адаптивная скорость (ликвидирует микро-задержки без рывков)
            // Если отстаем более чем на 100мс — чуть ускоряем видео (на 10%)
            if (delta > 0.1 && delta < 0.5) {
                video.playbackRate = 1.1;
            }
            // Если отстаем критично — прыгаем в конец
            else if (delta >= 0.5) {
                video.currentTime = bufferEnd;
                video.playbackRate = 1.0;
            }
            // Если все в норме — обычная скорость
            else {
                video.playbackRate = 1.0;
            }
        }
    }
}