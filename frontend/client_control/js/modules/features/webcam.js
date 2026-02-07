// frontend/client_control/js/modules/features/webcam.js
window.updateWebcamFeed = (pay) =>
    window.renderStream('webcamImg', pay, '.webcam-display', 'webcamPlaceholder');

window.stopWebcamUI = () => {
    const img = document.getElementById('webcamImg');
    if (img) img.style.display = 'none';
    document.getElementById('webcamPlaceholder').style.display = 'block';
};