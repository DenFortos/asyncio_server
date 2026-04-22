// frontend/client_control/js/modules/features/screen_renderer.js

let jmuxer = null, isJpegMode = null, visTimer = null;
const vid = document.getElementById('desktopVideo'), cvs = document.getElementById('desktopCanvas');
const ovl = document.getElementById('desktopOverlay'), btn = document.getElementById('btn-desktop-stream');

// Принудительная остановка стрима и уведомление бота
const stopStreaming = () => {
  if (window.AppState?.desktop) window.AppState.desktop.observe = false;
  window.sendToBot?.("ScreenView", "stop_stream");
  btn?.classList.remove('active');
};

// Управление паузой при скрытии вкладки
const handleVisibility = () => {
  if (document.hidden) {
    visTimer = setTimeout(() => {
      btn?.classList.contains('active') && stopStreaming();
      btn && ([btn.dataset.paused, btn.title] = ['true', 'Стрим на паузе. Кликни для запуска']);
    }, 120000);
  } else {
    clearTimeout(visTimer);
    if (btn?.dataset.paused === 'true') [btn.dataset.paused, btn.title] = ['false', 'Start/Stop Stream'];
  }
};

document.addEventListener('visibilitychange', handleVisibility);
window.addEventListener('beforeunload', stopStreaming);

// Сброс рендерера и очистка памяти
export const resetRenderer = () => {
  if (jmuxer) { try { jmuxer.destroy(); } catch(e){} jmuxer = null; }
  if (vid) {
    vid.pause();
    [vid.src, vid.style.display] = ["", 'none'];
    vid.load();
  }
  ovl?.classList.remove('hidden');
  isJpegMode = null;
};

// Основной цикл рендеринга потока
export async function renderScreenRGBA(payload) {
  if (document.hidden || !payload || payload.byteLength < 10) return;
  const videoData = new Uint8Array(payload);

  // Определяем тип потока (H264 или JPEG) по первому пакету
  if (isJpegMode === null) isJpegMode = (videoData[0] === 0xFF && videoData[1] === 0xD8);

  // Инициализация JMuxer только для видеопотока
  if (!isJpegMode && !jmuxer) {
    jmuxer = new window.JMuxer({
      node: vid, mode: 'video', fps: 60, flushingTime: 10, clearBuffer: true,
      onError: (err) => { console.error("JMuxer:", err); resetRenderer(); }
    });
  }

  // Проверка отображения видео-элемента
  if (!vid.style.display || vid.style.display === 'none') {
    vid.style.display = 'block';
    ovl?.classList.add('hidden');
  }

  // Подгонка размера холста
  if (vid.videoWidth > 0 && cvs && (cvs.width !== vid.videoWidth || cvs.height !== vid.videoHeight)) {
    [cvs.width, cvs.height] = [vid.videoWidth, vid.videoHeight];
  }

  // Подача данных в муксер
  if (!isJpegMode && jmuxer) {
    jmuxer.feed({ video: videoData });
    
    if (vid.paused && vid.readyState >= 1) vid.play().catch(() => {});
    
    // Синхронизация времени для минимизации задержки
    if (vid.buffered.length > 0) {
      const end = vid.buffered.end(vid.buffered.length - 1);
      if (end - vid.currentTime > 0.3) vid.currentTime = end - 0.05;
    }
  }
}