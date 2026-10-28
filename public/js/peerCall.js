import { setupCallControls } from './callControls.js';
import { on, request, isConnected } from './socket.js';
import { getLocalMedia, stopMediaStream, mediaErrorMessage } from './localMedia.js';

// Socket.IO transporta la señalización; RTCPeerConnection transporta los medios.
export function setupPeerCall(getCurrentUser, report, fail, view) {
  let active = null;
  let retryCallId = null, retries = 0;
  const controls = setupCallControls(flags => {
    if (active?.channel?.readyState === 'open') active.channel.send(JSON.stringify(flags));
  });
  const state = document.getElementById('call-rtc-state');
  const local = document.getElementById('call-local-video');
  const remote = document.getElementById('call-remote-video');
  const videos = document.getElementById('call-videos');
  function stop(preserveStream = false) {
    const session = active; active = null;
    if (session) {
      clearTimeout(session.timer);
      clearTimeout(session.recoveryTimer); session.pc.close(); if (!preserveStream) stopMediaStream(session.stream);
    }
    for (const video of [local, remote]) { video.pause(); video.srcObject = null; }
    videos.hidden = true; controls.setStream(null);
    state.textContent = 'WebRTC: Desconectado'; view.state('ended');
    document.getElementById('call-play').hidden = true;
  }
  function problem(session, error) {
    if (active !== session) return;
    stop(); fail(mediaErrorMessage(error));
  }
  async function signal(session, event, value) {
    if (active !== session) return;
    if (!isConnected()) return; // La sincronización renegocia al volver la sesión.
    await request(event, { callId: session.id, revision: session.revision, ...value });
  }
  async function recover(session, error) {
    if (active !== session || session.restarting) return;
    if (!isConnected()) { report('Esperando recuperar el chat para restablecer la llamada…'); return; }
    if (retries >= 2) { problem(session, error); return; }
    session.restarting = true; retries++;
    report('Restableciendo la conexión de la llamada…'); view.state('connecting');
    try {
      const response = await request('call:restart', { callId: session.id, revision: session.revision });
      if (active !== session) return;
      if (response.call.revision !== session.revision) start(response.call);
      else { session.restarting = false; session.recoveryTimer = setTimeout(() => recover(session, error), 5000); }
    } catch (failure) { if (active === session) { session.restarting = false; session.recoveryTimer = setTimeout(() => recover(session, failure), 5000); } }
  }
  function start(call) {
    if (active?.id === call.id && active.revision === (call.revision || 0)) return;
    const reuse = active?.id === call.id ? active.stream : null;
    stop(!!reuse);
    if (retryCallId !== call.id) { retryCallId = call.id; retries = 0; }
    document.dispatchEvent(new CustomEvent('media:stop-preview'));
    const pc = new RTCPeerConnection();
    const session = { id: call.id, revision: call.revision || 0, pc, stream: reuse, remoteFlags: { camera: call.mode !== 'audio', mic: true }, candidates: [], queue: Promise.resolve() };
    active = session; videos.hidden = false;
    state.textContent = 'WebRTC: Conectando'; view.state('connecting');
    function attachChannel(channel) {
      session.channel = channel;
      channel.onopen = () => { if (active === session) channel.send(JSON.stringify(controls.flags())); };
      channel.onmessage = event => {
        if (active !== session || typeof event.data !== 'string' || event.data.length > 200) return;
        try { const flags = JSON.parse(event.data); if (typeof flags.camera === 'boolean' && typeof flags.mic === 'boolean') { session.remoteFlags = flags; view.remoteMedia(flags); } } catch {}
      };
    }
    pc.ondatachannel = event => attachChannel(event.channel);
    if (call.caller.id === getCurrentUser()?.id) attachChannel(pc.createDataChannel('media-state'));
    report(call.mode === 'audio' ? 'Activando micrófono…' : 'Activando cámara y micrófono…');

    pc.onicecandidate = event => {
      if (event.candidate) signal(session, 'webrtc:ice-candidate', { candidate: event.candidate.toJSON() }).catch(error => problem(session, error));
    };
    pc.ontrack = event => {
      if (active !== session) return;
      if (!remote.srcObject) remote.srcObject = new MediaStream();
      remote.srcObject.addTrack(event.track);
      if (event.track.kind === 'video') { view.remoteMedia(session.remoteFlags); event.track.onmute = () => view.remoteMedia({ ...session.remoteFlags, camera: false }); event.track.onunmute = () => view.remoteMedia(session.remoteFlags); }
      remote.play().catch(() => { document.getElementById('call-play').hidden = false; report('Pulsa Reproducir audio y video para escuchar a la otra persona.'); });
    };
    pc.onconnectionstatechange = () => {
      if (active !== session) return;
      state.textContent = 'WebRTC: ' + ({ connected: 'Conectado', connecting: 'Conectando', disconnected: 'Interrumpido', failed: 'Error', closed: 'Desconectado' }[pc.connectionState] || 'Conectando');
      view.state(pc.connectionState);
      if (pc.connectionState === 'connected') { clearTimeout(session.timer); clearTimeout(session.recoveryTimer); report(call.mode === 'audio' ? 'Llamada de audio conectada.' : 'Videollamada conectada.'); }
      if (pc.connectionState === 'disconnected') { report('La conexión de medios se interrumpió. Intentando recuperarla…'); clearTimeout(session.recoveryTimer); session.recoveryTimer = setTimeout(() => recover(session, new Error('No se pudo recuperar la conexión de medios.')), 5000); }
      if (pc.connectionState === 'failed') recover(session, new Error('No se pudo restablecer la conexión. Comprueba el servicio TURN y la red.'));
    };
    session.ready = (async () => {
      const response = await request('webrtc:config', { callId: call.id });
      if (active !== session) return;
      const { turnConfigured, ...configuration } = response.config;
      pc.setConfiguration(configuration);
      const stream = reuse || await getLocalMedia({ video: call.mode !== 'audio' });
      if (active !== session) { stopMediaStream(stream); return; }
      session.stream = stream; local.srcObject = stream; controls.setStream(stream);
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        track.addEventListener('ended', () => problem(session, new Error('Se detuvo la cámara o el micrófono.')), { once: true });
      });
      await local.play();
      if (active !== session) return;
      session.timer = setTimeout(() => recover(session, new Error('No se pudo establecer la llamada tras varios intentos. Comprueba la red y la configuración TURN.')), 45000);
      report('Conectando audio y video…');
      if (call.caller.id === getCurrentUser()?.id) {
        await pc.setLocalDescription(await pc.createOffer());
        await signal(session, 'webrtc:offer', { description: pc.localDescription.toJSON() });
      }
    })();
    session.ready.catch(error => problem(session, error));
  }
  for (const event of ['webrtc:offer', 'webrtc:answer', 'webrtc:ice-candidate']) on(event, payload => {
    const session = active;
    if (!session || payload.callId !== session.id || (payload.revision ?? 0) !== session.revision) return;
    // ICE puede llegar antes de setRemoteDescription; se guarda hasta tener SDP.
    session.queue = session.queue.then(async () => {
      await session.ready;
      if (active !== session) return;
      if (event === 'webrtc:ice-candidate') {
        if (session.pc.remoteDescription) await session.pc.addIceCandidate(payload.candidate);
        else session.candidates.push(payload.candidate);
        return;
      }
      await session.pc.setRemoteDescription(payload.description);
      for (const candidate of session.candidates.splice(0)) await session.pc.addIceCandidate(candidate);
      if (event === 'webrtc:offer') {
        await session.pc.setLocalDescription(await session.pc.createAnswer());
        await signal(session, 'webrtc:answer', { description: session.pc.localDescription.toJSON() });
      }
    }).catch(error => problem(session, error));
  });
  document.getElementById('call-play').addEventListener('click', () => {
    remote.play().then(() => { document.getElementById('call-play').hidden = true; report('Audio y video en reproducción.'); }).catch(error => report(error.message));
  });
  window.addEventListener('pagehide', stop);
  return { start, stop, isActive: id => active?.id === id };
}
