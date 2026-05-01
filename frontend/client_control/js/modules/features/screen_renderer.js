// frontend/client_control/js/modules/features/screen_renderer.js

let jmuxer = null;
let isJpegMode = null;

const $ = id => document.getElementById(id);

export const resetRenderer = () => {
    const vid = document.getElementById('desktopVideo');
    const ovl = document.getElementById('desktopOverlay');
    
    if (jmuxer) {
        try { 
            jmuxer.destroy(); 
            console.log("[Renderer] JMuxer destroyed");
        } catch (e) {
            console.error("[Renderer] Destroy error:", e);
        }
        jmuxer = null;
    }

    if (vid) {
        vid.pause();
        vid.src = "";
        vid.load(); // Очистка ресурсов браузера
        vid.style.display = 'none';
    }

    if (ovl) {
        ovl.classList.remove('hidden');
    }

    isJpegMode = null;
    console.log("[Renderer] State fully reset");
};

export async function renderScreenRGBA(payload) {
    const vid = document.getElementById('desktopVideo');
    const cvs = document.getElementById('desktopCanvas');
    const ovl = document.getElementById('desktopOverlay');
    
    if (document.hidden || !payload || payload.byteLength < 10) return;

    const data = new Uint8Array(payload);

    // 1. Детект формата (один раз за сессию)
    if (isJpegMode === null) {
        isJpegMode = (data[0] === 0xFF && data[1] === 0xD8);
        console.log(`[Renderer] Mode detected: ${isJpegMode ? 'JPEG' : 'H.264'}`);
        
        if (!isJpegMode && vid) {
            // Принудительно готовим видео-тег
            vid.style.display = 'block';
            vid.muted = true;
            vid.setAttribute('autoplay', '');
            vid.setAttribute('playsinline', '');
            
            vid.onwaiting = () => console.warn("[Video] Buffering...");
            vid.onerror = () => console.error("[Video] Error:", vid.error);
            vid.onplaying = () => {
                console.log("[Video] Playing started!");
                ovl?.classList.add('hidden');
            };
        }
    }

    if (!isJpegMode) {
        // --- H.264 MODE ---
        if (!jmuxer) {
            jmuxer = new window.JMuxer({
                node: vid,
                mode: 'video',
                flushingTime: 0, // Минимальная задержка
                clearBuffer: true,
                fps: 30, // Желательно указать явно
                debug: false 
            });
            console.log("[Renderer] JMuxer initialized");
            
            // Скрываем заглушку сразу при инициализации муксера
            ovl?.classList.add('hidden');
        }

        try {
            jmuxer.feed({ video: data });
        } catch (e) {
            console.error("[Renderer] JMuxer feed error:", e);
        }

        // Принудительный старт, если браузер поставил на паузу
        if (vid.paused) {
            vid.play().catch(err => console.error("[Video] Play failed:", err));
        }

    } else {
        // --- JPEG MODE ---
        if (vid) vid.style.display = 'none';
        
        const url = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
        const img = new Image();
        img.onload = () => {
            if (cvs) {
                if (cvs.width !== img.width || cvs.height !== img.height) {
                    cvs.width = img.width;
                    cvs.height = img.height;
                }
                const ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0);
            }
            ovl?.classList.add('hidden');
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }
}