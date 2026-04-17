// frontend/client_control/js/modules/ui/fullscreen.js

const target = document.querySelector('.app-main'), 
      header = document.getElementById('header'), 
      btn = document.querySelector('.fullscreen-btn');
let timer = null;

// Инициализация логики полноэкранного режима и авто-скрытия шапки
export const initFullscreen = () => {
  if (!btn || !target) return;

  btn.onclick = () => document.fullscreenElement 
    ? document.exitFullscreen() 
    : target.requestFullscreen().catch(e => console.error(e));

  document.addEventListener('fullscreenchange', syncState);
  initHoverLogic();
};

// Синхронизация иконок и классов при переключении Fullscreen
const syncState = () => {
  const isFs = !!document.fullscreenElement;
  const icon = btn.querySelector('i');

  btn.classList.toggle('active', isFs);
  icon && (icon.className = `fas fa-${isFs ? 'compress' : 'expand'}`);
  
  if (!isFs) {
    header?.classList.remove('header-show');
    clearTimeout(timer);
  }
};

// Логика отображения шапки при наведении в углы экрана в Fullscreen
const initHoverLogic = () => {
  document.addEventListener('mousemove', ({ clientX: x, clientY: y }) => {
    if (!document.fullscreenElement) return;

    const inCorner = (x <= 3 || x >= window.innerWidth - 3) && y <= 3;

    if (inCorner && !timer) {
      timer = setTimeout(() => header?.classList.add('header-show'), 200);
    } else if (!inCorner) {
      clearTimeout(timer);
      timer = null;
    }
  });

  header?.addEventListener('mouseleave', () => 
    document.fullscreenElement && header.classList.remove('header-show')
  );
};