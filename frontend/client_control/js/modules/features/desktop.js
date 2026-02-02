// js/modules/features/desktop.js
window.updateDesktopFeed = (pay) =>
    window.renderStream('remoteScreen', pay, '.desktop-display', 'desktopPlaceholder');

window.clearDesktopUI = () => {
    const img = document.getElementById('remoteScreen');
    if (img) img.style.display = 'none';
    document.getElementById('desktopPlaceholder').style.display = 'block';
};