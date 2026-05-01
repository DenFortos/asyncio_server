let jmuxer = null;
let isJpegMode = null;
const TARGET_FPS = 60;

export const resetRenderer = () => {
    const vid = document.getElementById('desktopVideo');
    const cvs = document.getElementById('desktopCanvas');
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

    // Очистка холста, чтобы не висел "призрак" старого кадра
    if (cvs) {
        const ctx = cvs.getContext('2d');
        ctx.clearRect(0, 0, cvs.width, cvs.height);
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
            vid.setAttribute('autoplay', '');
            vid.setAttribute('muted', '');
            vid.setAttribute('playsinline', '');
            
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
                flushingTime: 0,
                clearBuffer: true,
                fps: TARGET_FPS,
                readOnly: false,
                debug: false 
            });
            ovl?.classList.add('hidden');
        }
        jmuxer.feed({ video: data });

        if (vid.paused && vid.readyState >= 2) {
            vid.play().catch(() => {});
        }
    } else {
        renderJpeg(data, cvs, ovl);
    }
}

function renderJpeg(data, cvs, ovl) {
    const url = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
    const img = new Image();
    img.onload = () => {
        if (cvs) {
            // Подгоняем размер холста под картинку только если они реально отличаются
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