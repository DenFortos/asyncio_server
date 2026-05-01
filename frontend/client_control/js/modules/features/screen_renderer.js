// frontend/client_control/js/modules/features/screen_renderer.js

let jmuxer = null;
let isJpegMode = null;
const TARGET_FPS = 60; // Синхронизируем с твоим конфигом бота

export const resetRenderer = () => {
    const vid = document.getElementById('desktopVideo');
    const ovl = document.getElementById('desktopOverlay');
    
    if (jmuxer) {
        try { jmuxer.destroy(); } catch (e) {}
        jmuxer = null;
    }

    if (vid) {
        vid.pause();
        vid.removeAttribute('src'); 
        vid.load();
        vid.style.display = 'none';
    }
    if (ovl) ovl.classList.remove('hidden');
    isJpegMode = null;
};

export async function renderScreenRGBA(payload) {
    const vid = document.getElementById('desktopVideo');
    const cvs = document.getElementById('desktopCanvas');
    const ovl = document.getElementById('desktopOverlay');
    
    if (document.hidden || !payload || payload.byteLength < 10) return;

    const data = new Uint8Array(payload);

    if (isJpegMode === null) {
        isJpegMode = (data[0] === 0xFF && data[1] === 0xD8);
        if (!isJpegMode && vid) {
            vid.style.display = 'block';
            // Критично для 60 FPS: отключаем всё, что может вызвать лаг
            vid.setAttribute('autoplay', '');
            vid.setAttribute('muted', '');
            vid.setAttribute('playsinline', '');
            
            // "Доводчик" времени: если отстаем от буфера более чем на 0.2 сек - прыгаем в конец
            vid.ontimeupdate = () => {
                if (vid.buffered.length > 0) {
                    const delta = vid.buffered.end(0) - vid.currentTime;
                    if (delta > 0.2) { 
                        vid.currentTime = vid.buffered.end(0) - 0.01;
                    }
                }
            };
        }
    }

    if (!isJpegMode) {
        if (!jmuxer) {
            jmuxer = new window.JMuxer({
                node: vid,
                mode: 'video',
                flushingTime: 0,      // Немедленный вывод
                clearBuffer: true,    // Очистка старых кадров
                fps: TARGET_FPS,      // Явно 60
                readOnly: false,
                debug: false 
            });
            ovl?.classList.add('hidden');
        }

        // Подаем данные. JMuxer сам разберется с H.264 чанками
        jmuxer.feed({ video: data });

        // Force play для обхода политик браузера
        if (vid.paused && vid.readyState >= 2) {
            vid.play().catch(() => {});
        }
    } else {
        // JPEG Mode (оставляем как есть, но это не для 60 FPS)
        renderJpeg(data, cvs, ovl);
    }
}

function renderJpeg(data, cvs, ovl) {
    const url = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
    const img = new Image();
    img.onload = () => {
        if (cvs) {
            if (cvs.width !== img.width || cvs.height !== img.height) {
                cvs.width = img.width;
                cvs.height = img.height;
            }
            cvs.getContext('2d', { alpha: false }).drawImage(img, 0, 0);
        }
        ovl?.classList.add('hidden');
        URL.revokeObjectURL(url);
    };
    img.src = url;
}