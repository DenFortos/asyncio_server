// frontend\client_control\js\modules\features\screen_renderer.js

/**
 * МОДУЛЬ SCREENVIEW RENDERER (V7.2)
 * Путь: frontend/client_control/js/modules/features/screen_renderer.js
 */

let jmuxer = null;
let isJpegMode = null;
let visTimer = null;

const vid = document.getElementById('desktopVideo');
const cvs = document.getElementById('desktopCanvas');
const ovl = document.getElementById('desktopOverlay');
const btn = document.getElementById('btn-desktop-stream');

/**
 * Остановка стрима (Отправка 0 согласно ТЗ)
 */
export const stopStreaming = () => {
    if (window.AppState?.desktop) {
        window.AppState.desktop.observe = false;
    }
    
    // Отправка команды остановки боту
    if (window.sendToBot) {
        window.sendToBot("ScreenView:None", 0);
    }
    
    btn?.classList.remove('active');
    resetRenderer();
};

/**
 * Сброс состояния плеера
 */
export const resetRenderer = () => {
    if (jmuxer) {
        try { jmuxer.destroy(); } catch (e) {}
        jmuxer = null;
    }
    
    if (vid) {
        vid.pause();
        vid.src = "";
        vid.style.display = 'none';
        vid.load();
    }
    
    ovl?.classList.remove('hidden');
    isJpegMode = null;
};

/**
 * Рендеринг потока ScreenView (V7.2)
 * Принимает ArrayBuffer (байты кадра)
 */
export async function renderScreenRGBA(payload) {
    // Игнорируем анонсы (числа), скрытую вкладку и некорректные данные
    if (document.hidden || !payload || typeof payload === 'number' || payload.byteLength < 10) {
        return;
    }

    const videoData = new Uint8Array(payload);

    // Определение формата (JPEG vs H264) по магическим числам (FF D8 - JPEG)
    if (isJpegMode === null) {
        isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);
        console.log(`[ScreenView] Stream format: ${isJpegMode ? 'JPEG' : 'H264'}`);
    }

    if (!isJpegMode) {
        // --- VIDEO MODE (H264 + JMuxer) ---
        if (!jmuxer) {
            jmuxer = new window.JMuxer({
                node: vid,
                mode: 'video',
                fps: 60,
                flushingTime: 0, // Минимальная задержка
                clearBuffer: true,
                onError: () => resetRenderer()
            });
        }

        if (vid.style.display === 'none' || !vid.style.display) {
            vid.style.display = 'block';
            ovl?.classList.add('hidden');
        }

        // Подача данных в декодер
        jmuxer.feed({ video: videoData });

        // Авто-плей
        if (vid.paused && vid.readyState >= 1) {
            vid.play().catch(() => {});
        }

        // Синхронизация Low Latency (прыгаем в конец буфера, если отстаем)
        if (vid.buffered.length > 0) {
            const end = vid.buffered.end(vid.buffered.length - 1);
            if (end - vid.currentTime > 0.2) {
                vid.currentTime = end - 0.01;
            }
        }
    } else {
        // --- IMAGE MODE (JPEG) ---
        const url = URL.createObjectURL(new Blob([videoData], { type: 'image/jpeg' }));
        const img = new Image();
        img.onload = () => {
            if (cvs) {
                if (cvs.width !== img.width) {
                    cvs.width = img.width;
                    cvs.height = img.height;
                }
                cvs.getContext('2d').drawImage(img, 0, 0);
            }
            URL.revokeObjectURL(url);
        };
        img.src = url;
        ovl?.classList.add('hidden');
    }

    // Синхронизация размеров Canvas с Video (критично для RemoteControl)
    if (!isJpegMode && vid.videoWidth > 0 && cvs && cvs.width !== vid.videoWidth) {
        cvs.width = vid.videoWidth;
        cvs.height = vid.videoHeight;
    }
}

/**
 * Логика управления видимостью вкладки (Пауза 120 сек)
 */
const handleVisibility = () => {
    if (document.hidden) {
        visTimer = setTimeout(() => {
            if (btn?.classList.contains('active')) {
                stopStreaming();
            }
            if (btn) {
                btn.dataset.paused = 'true';
                btn.title = 'Stream paused';
            }
        }, 120000);
    } else {
        clearTimeout(visTimer);
        if (btn?.dataset.paused === 'true') {
            btn.dataset.paused = 'false';
            btn.title = 'Start/Stop Stream';
        }
    }
};

// Инициализация событий
document.addEventListener('visibilitychange', handleVisibility);
window.addEventListener('beforeunload', stopStreaming);