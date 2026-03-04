/* frontend/client_control/js/modules/ui/fullscreen.js */

const fsTarget = document.querySelector('.app-main');
const header = document.getElementById('header');
const fsBtn = document.querySelector('.fullscreen-btn');

const CORNER_SIZE = 3;
const CORNER_DELAY = 200;

let showTimer = null;
let hideTimer = null;

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ
========================================================================== */
export function initFullscreen() {
    if (!fsBtn || !fsTarget) return;

    fsBtn.onclick = () => {
        document.fullscreenElement
            ? document.exitFullscreen()
            : fsTarget.requestFullscreen().catch(console.error);
    };

    document.addEventListener('fullscreenchange', syncFsState);
    initTriggerLogic();
}

/* ==========================================================================
   2. СИНХРОНИЗАЦИЯ СОСТОЯНИЯ
========================================================================== */
function syncFsState() {
    const isFs = !!document.fullscreenElement;
    fsBtn.classList.toggle('active', isFs);

    const icon = fsBtn.querySelector('i');
    if (icon) icon.className = isFs ? 'fas fa-compress' : 'fas fa-expand';

    if (!isFs) {
        header.classList.remove('header-show');
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
    }
}

/* ==========================================================================
   3. ЛОГИКА ТРИГГЕРА
========================================================================== */
function initTriggerLogic() {
    document.addEventListener('mousemove', (e) => {
        if (!document.fullscreenElement) return;

        const inCorner = (e.clientX <= CORNER_SIZE || e.clientX >= window.innerWidth - CORNER_SIZE)
                      && e.clientY <= CORNER_SIZE;

        if (inCorner && !showTimer) {
            showTimer = setTimeout(() => header.classList.add('header-show'), CORNER_DELAY);
        } else if (!inCorner) {
            clearTimeout(showTimer);
            showTimer = null;
        }
    });

    header.addEventListener('mouseleave', () => {
        if (document.fullscreenElement) {
            header.classList.remove('header-show');
            clearTimeout(hideTimer);
        }
    });

    header.addEventListener('click', () => clearTimeout(hideTimer));
}