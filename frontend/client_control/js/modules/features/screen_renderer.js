// frontend/client_control/js/modules/features/screen_renderer.js
let jmuxer = null, isJpegMode = null, visibilityTimeout = null;
const video = document.getElementById('desktopVideo'), canvas = document.getElementById('desktopCanvas');
const overlay = document.getElementById('desktopOverlay'), streamBtn = document.getElementById('btn-desktop-stream');

const handleVisibilityChange = () => {
    if (document.hidden) {
        visibilityTimeout = setTimeout(() => {
            if (streamBtn?.classList.contains('active')) {
                if (window.AppState?.desktop) window.AppState.desktop.observe = false;
                window.sendToBot?.("ScreenWatch", "stop_stream");
                streamBtn.classList.remove('active');
                [streamBtn.dataset.paused, streamBtn.title] = ['true', 'Стрим на паузе. Кликни для запуска'];
            }
        }, 120000);
    } else {
        clearTimeout(visibilityTimeout);
        if (streamBtn?.dataset.paused === 'true') [streamBtn.dataset.paused, streamBtn.title] = ['false', 'Start/Stop Stream'];
    }
};

document.addEventListener('visibilitychange', handleVisibilityChange);

export function resetRenderer() {
    if (jmuxer) { try { jmuxer.destroy(); } catch(e){} jmuxer = null; }
    if (video) {
        video.pause();
        [video.src, video.style.display] = ["", 'none'];
        video.load();
    }
    overlay?.classList.remove('hidden');
    isJpegMode = null;
}

export async function renderScreenRGBA(payload) {
    if (document.hidden || !payload || payload.byteLength < 10) return;
    const videoData = new Uint8Array(payload);

    if (isJpegMode === null) isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);

    if (!isJpegMode && !jmuxer) {
        jmuxer = new window.JMuxer({
            node: video, mode: 'video', fps: 60, flushingTime: 10, clearBuffer: true,
            onError: (err) => { console.error("JMuxer:", err); resetRenderer(); }
        });
    }

    if (!video.style.display || video.style.display === 'none') {
        video.style.display = 'block';
        overlay?.classList.add('hidden');
    }

    if (video.videoWidth > 0 && canvas && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        [canvas.width, canvas.height] = [video.videoWidth, video.videoHeight];
    }

    if (!isJpegMode && jmuxer) {
        jmuxer.feed({ video: videoData });
        video.paused && video.readyState >= 1 && video.play().catch(() => {});
        
        if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            if (end - video.currentTime > 0.3) video.currentTime = end - 0.05;
            video.playbackRate = 1.0;
        }
    }
}