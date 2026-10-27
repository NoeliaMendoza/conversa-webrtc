import { icon } from './icons.js';
// Las pistas se silencian sin cerrar la conexión. El canal RTC comunica su estado.
export function setupCallControls(onChange = () => {}) {
  let stream = null;
  const el = id => document.getElementById(id);
  const audio = el('call-mic'), video = el('call-camera');
  function flags() { return { camera: !!stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live'), mic: !!stream?.getAudioTracks().some(t => t.enabled && t.readyState === 'live') }; }
  function render() {
    const value = flags();
    for (const [button, kind, off, on, name] of [[audio, 'audio', 'Activar micrófono', 'Silenciar micrófono', 'mic'], [video, 'video', 'Activar cámara', 'Apagar cámara', 'camera']]) {
      const tracks = stream?.getTracks().filter(t => t.kind === kind && t.readyState === 'live') || [];
      const enabled = tracks.some(t => t.enabled);
      button.disabled = !tracks.length;
      const text = document.createElement('span'); text.textContent = enabled ? on : off;
      button.replaceChildren(icon(enabled ? name : name + '-off'), text);
      button.title = text.textContent; button.setAttribute('aria-label', text.textContent);
      button.setAttribute('aria-pressed', String(!enabled));
      if (kind === 'video') button.hidden = !!stream && !tracks.length;
    }
    el('call-local-placeholder').hidden = value.camera;
    el('call-local-video').classList.toggle('camera-hidden', !value.camera);
    el('call-local-note').textContent = value.mic ? '' : ' · silenciado';
    onChange(value);
  }
  for (const [button, kind] of [[audio, 'audio'], [video, 'video']]) button.addEventListener('click', () => {
    const tracks = stream?.getTracks().filter(t => t.kind === kind && t.readyState === 'live') || [];
    const enable = !tracks.some(t => t.enabled); tracks.forEach(t => { t.enabled = enable; }); render();
  });
  function setStream(value) { stream = value; el('call-media-controls').hidden = !value; render(); }
  setStream(null);
  return { setStream, flags };
}
