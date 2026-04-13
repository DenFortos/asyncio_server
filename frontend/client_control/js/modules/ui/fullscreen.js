/* frontend/client_control/js/modules/ui/fullscreen.js */
const fsTarget = document.querySelector('.app-main'), header = document.getElementById('header'), fsBtn = document.querySelector('.fullscreen-btn');
let showTimer = null;

export function initFullscreen() {
    if (!fsBtn || !fsTarget) return;
    fsBtn.onclick = () => document.fullscreenElement ? document.exitFullscreen() : fsTarget.requestFullscreen().catch(console.error);
    document.addEventListener('fullscreenchange', syncFsState);
    initTriggerLogic();
}

const syncFsState = () => {
    const isFs = !!document.fullscreenElement;
    fsBtn.classList.toggle('active', isFs);
    const icon = fsBtn.querySelector('i');
    if (icon) icon.className = `fas fa-compress${isFs ? '' : '-expand'}`;
    if (!isFs) {
        header.classList.remove('header-show');
        clearTimeout(showTimer);
    }
};

function initTriggerLogic() {
    document.addEventListener('mousemove', e => {
        if (!document.fullscreenElement) return;
        const inCorner = (e.clientX <= 3 || e.clientX >= window.innerWidth - 3) && e.clientY <= 3;
        if (inCorner && !showTimer) showTimer = setTimeout(() => header.classList.add('header-show'), 200);
        else if (!inCorner) { clearTimeout(showTimer); showTimer = null; }
    });
    header.addEventListener('mouseleave', () => document.fullscreenElement && header.classList.remove('header-show'));
}