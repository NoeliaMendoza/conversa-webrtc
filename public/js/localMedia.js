// Captura compartida por la vista previa y la videollamada.
export async function getLocalMedia({ video = true } = {}) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Abre la aplicación en localhost o mediante HTTPS para usar cámara y micrófono.');
  }
  return navigator.mediaDevices.getUserMedia({
    video: video && { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: true
  });
}

export function stopMediaStream(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

export function mediaErrorMessage(error) {
  const messages = {
    NotAllowedError: 'No se concedió permiso. Permite el acceso a cámara y micrófono en el navegador.',
    NotFoundError: 'No se encontró cámara o micrófono. Comprueba los dispositivos conectados.',
    NotReadableError: 'No se pudo abrir la cámara o el micrófono. Puede que otra aplicación los esté usando.',
    OverconstrainedError: 'El dispositivo no admite la configuración solicitada.',
    AbortError: 'La captura se interrumpió. Inténtalo nuevamente.'
  };
  return messages[error.name] || error.message || 'No se pudo iniciar la captura local.';
}
