import { setupCallWindow } from './callWindow.js';
import { avatarFor, icon } from './icons.js';
export function setupCallView() {
  const el = id => document.getElementById(id);
  const panel = el('call-panel');
  const callWindow = setupCallWindow();
  let callId = null;
  let started = null, ticker = null, mode = 'video';
  function tick() {
    const seconds = Math.floor((Date.now() - started) / 1000);
    el('call-duration').textContent = [Math.floor(seconds / 60), seconds % 60].map(v => String(v).padStart(2, '0')).join(':');
  }
  function state(value) {
    panel.dataset.state = value;
    el('call-rtc-state').textContent = 'WebRTC: ' + ({ connected: 'Conectado', connecting: 'Conectando', disconnected: 'Interrumpido', failed: 'Error', ended: 'Desconectado', pending: 'Desconectado' }[value] || 'Conectando');
    if (value === 'connected') { if (!started) started = Date.now(); tick(); if (!ticker) ticker = setInterval(tick, 1000); el('call-duration').hidden = false; }
    if (value === 'ended' || value === 'failed') { clearInterval(ticker); ticker = null; }
  }
  function show(call, me) {
    if (callId !== call.id) { clearInterval(ticker); ticker = null; started = null; el('call-duration').hidden = true; callWindow.reset(); callId = call.id; }
    panel.dataset.lifecycle = call.status;
    el('call-minimize').hidden = el('call-expand').hidden = call.status !== 'accepted';
    el('call-self-toggle').hidden = call.status !== 'accepted' || call.mode === 'audio';
    if (call.status === 'ended') callWindow.restore();
    const other = call.caller.id === me?.id ? call.recipient : call.caller;
    mode = call.mode || 'video';
    panel.dataset.mode = mode;
    el('call-type').textContent = mode === 'audio' ? 'Llamada de audio' : 'Videollamada';
    el('call-kind-icon').replaceChildren(icon(mode === 'audio' ? 'phone' : 'camera'));
    el('call-peer').textContent = other.name;
    for (const id of ['call-avatar', 'call-remote-avatar']) el(id).replaceChildren(avatarFor(other.name));
    el('call-local-avatar').replaceChildren(avatarFor(me?.name || 'Tú'));
    el('call-remote-name').textContent = el('call-remote-caption').textContent = other.name;
    if (call.status === 'pending') {
      clearInterval(ticker); ticker = null; started = null; el('call-duration').hidden = true;
      el('call-duration').textContent = '00:00'; state('pending');
      remoteMedia({ camera: false, mic: true }, false);
    }
    if (call.status === 'accepted') state('connecting');
    if (call.status === 'ended') state('ended');
  }
  function remoteMedia(flags, received = true) {
    el('call-remote-placeholder').hidden = flags.camera && mode !== 'audio';
    el('call-remote-video').classList.toggle('camera-hidden', !flags.camera || mode === 'audio');
    el('call-remote-note').textContent = mode === 'audio' ? 'Llamada de audio' : !received ? 'Esperando video…' : 'Cámara desactivada';
    el('call-remote-muted').hidden = flags.mic;
  }
  function error(message) { el('call-error').textContent = message; el('call-error').hidden = !message; if (message) panel.dataset.state = 'failed'; }
  return { show, state, remoteMedia, error, restore: callWindow.restore, refresh: callWindow.refresh };
}
