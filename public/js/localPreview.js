import { getLocalMedia, stopMediaStream, mediaErrorMessage } from './localMedia.js';
import { on } from './socket.js';

export function setupLocalPreview() {
  const byId = id => document.getElementById(id);
  const dialog = byId('media-dialog');
  const video = byId('local-video');
  const status = byId('media-status');
  const start = byId('media-start');
  const stop = byId('media-stop');
  let stream = null;
  let requesting = false;
  let version = 0;

  function stopPreview() {
    version++;
    stopMediaStream(stream);
    stream = null;
    video.pause(); video.srcObject = null; video.hidden = true;
    byId('media-placeholder').hidden = false;
    start.disabled = requesting;
    stop.disabled = true;
    status.textContent = requesting ? 'Solicitud cancelada. Puedes cerrar el aviso de permisos del navegador.' : 'Cámara y micrófono detenidos.';
  }
  byId('media-open').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('workspace:close-panels'));
    status.textContent = 'Activa los dispositivos para comprobar tu vista previa local.';
    dialog.showModal(); start.focus();
  });
  byId('media-close').addEventListener('click', () => { stopPreview(); dialog.close(); });
  dialog.addEventListener('cancel', stopPreview);
  dialog.addEventListener('close', stopPreview);
  stop.addEventListener('click', stopPreview);
  start.addEventListener('click', async () => {
    if (requesting || stream) return;
    const attempt = ++version;
    requesting = true; start.disabled = true; stop.disabled = false;
    status.textContent = 'Esperando permiso para cámara y micrófono…';
    try {
      const captured = await getLocalMedia();
      if (attempt !== version || !dialog.open) { stopMediaStream(captured); return; }
      stream = captured;
      video.srcObject = captured; video.muted = true; video.hidden = false;
      byId('media-placeholder').hidden = true;
      await video.play();
      if (attempt !== version) return;
      status.textContent = 'Cámara y micrófono activos. El audio local está silenciado para evitar eco.';
      captured.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (stream === captured) stopPreview();
      }, { once: true }));
    } catch (error) {
      if (attempt === version) { stopPreview(); status.textContent = mediaErrorMessage(error); }
    } finally {
      requesting = false;
      start.disabled = !!stream;
      stop.disabled = !stream;
    }
  });
  document.addEventListener('media:stop-preview', () => { stopPreview(); if (dialog.open) dialog.close(); });
  window.addEventListener('pagehide', stopPreview);
  on('disconnect', () => { if (dialog.open) dialog.close(); else stopPreview(); });
}
