// frontend/client_control/js/modules/features/input_handler.js
import { AppState } from '../core/states.js';

const canvas = document.getElementById('desktopCanvas');
const video = document.getElementById('desktopVideo');

/**
 * Расчет координат 0.0 - 1.0. 
 * r.width/height теперь всегда равны видимой области видео.
 */
const getCoords = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    return { x: x.toFixed(3), y: y.toFixed(3) };
};

/**
 * Синхронизация: делает Canvas идентичным по размеру и положению 
 * реально отображаемой картинке видео (исключая черные полосы).
 */
const syncCanvasToVideo = () => {
    if (!canvas || !video || video.videoWidth === 0) return;

    const vRect = video.getBoundingClientRect();

    // Принудительно задаем размеры холста в пикселях как у видео на экране
    canvas.style.width = `${vRect.width}px`;
    canvas.style.height = `${vRect.height}px`;
    
    // Внутреннее разрешение для точности
    canvas.width = vRect.width;
    canvas.height = vRect.height;

    // Точное позиционирование поверх видео
    canvas.style.left = `${video.offsetLeft}px`;
    canvas.style.top = `${video.offsetTop}px`;
};

export const initInputHandlers = (send) => {
    if (!canvas || !video) return;

    // Реакция на изменения интерфейса и видеопотока
    const events = ['resize', 'scroll', 'fullscreenchange'];
    events.forEach(ev => window.addEventListener(ev, syncCanvasToVideo));
    
    video.addEventListener('loadedmetadata', syncCanvasToVideo);
    video.addEventListener('play', syncCanvasToVideo);
    
    // Начальная подстройка
    syncCanvasToVideo();

    // Mouse Move (m|x|y)
    canvas.addEventListener('mousemove', e => {
        if (!AppState.desktop.control) return;
        const p = getCoords(e);
        send("RemoteControl", `m|${p.x}|${p.y}`, "DATA");
    });

    // Mouse Buttons (d|btn или u|btn)
    const handleBtn = (e, action) => {
        if (!AppState.desktop.control) return;
        if (action === 'd') canvas.focus();

        const btn = e.button === 0 ? 'l' : (e.button === 2 ? 'r' : 'm');
        send("RemoteControl", `${action}|${btn}`, "DATA");
        
        if (e.button === 2) e.preventDefault();
    };

    canvas.addEventListener('mousedown', e => handleBtn(e, 'd'));
    canvas.addEventListener('mouseup', e => handleBtn(e, 'u'));
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Keyboard (k|code|state)
    const handleKey = (e, state) => {
        const activeEl = document.activeElement;
        const isTyping = ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) || activeEl.contentEditable === 'true';

        if (!AppState.desktop.control || isTyping) return;
        
        e.preventDefault();
        send("RemoteControl", `k|${e.code}|${state}`, "DATA");
    };

    window.addEventListener('keydown', e => handleKey(e, '1'), true);
    window.addEventListener('keyup', e => handleKey(e, '0'), true);

    // Scroll (s|delta)
    canvas.addEventListener('wheel', e => {
        if (!AppState.desktop.control) return;
        e.preventDefault();
        send("RemoteControl", `s|${e.deltaY > 0 ? 1 : -1}`, "DATA");
    }, { passive: false });

    // Резервная синхронизация (на случай анимаций CSS)
    setInterval(syncCanvasToVideo, 1000);
};