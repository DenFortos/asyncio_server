/* frontend/client_control/js/modules/ui/fullscreen.js */

const fsTarget = document.querySelector('.app-main');
const header = document.getElementById('header');
const fsBtn = document.querySelector('.fullscreen-btn');

/* ==========================================================================
   1. ИНИЦИАЛИЗАЦИЯ И ПЕРЕКЛЮЧЕНИЕ
========================================================================== */
export function initFullscreen() {
    if (!fsBtn || !fsTarget) return;

    fsBtn.onclick = () => {
        if (!document.fullscreenElement) {
            fsTarget.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
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

    if (!isFs) header.classList.remove('header-show');
}

/* ==========================================================================
   3. ЛОГИКА ТРИГГЕРА ШАПКИ
========================================================================== */
function initTriggerLogic() {
    // Stage: Capture (true) — ловим клик до того, как его перехватит Canvas
    window.addEventListener('mousedown', (e) => {
        if (!document.fullscreenElement) return;

        if (e.clientY <= 30) {
            console.log("[FS] Top zone clicked");
            header.classList.add('header-show');
        }
    }, true);

    header.addEventListener('mouseleave', () => {
        if (document.fullscreenElement) {
            header.classList.remove('header-show');
        }
    });
}