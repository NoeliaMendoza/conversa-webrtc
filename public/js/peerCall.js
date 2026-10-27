import { setupCallControls } from './callControls.js';
import { on, request } from './socket.js';
import { getLocalMedia, stopMediaStream, mediaErrorMessage } from './localMedia.js';

// Socket.IO transporta la señalización; RTCPeerConnection transporta los medios.
export function setupPeerCall(getCurrentUser, report, fail, view) {
  let active = null;
  const controls = setupCallControls(flags => {
    if (active?.channel?.readyState === 'open') active.channel.send(JSON.stringify(flags));
  });
  const state = document.getElementById('call-rtc-state');
  const local = document.getElementById('call-local-video');
  const remote = document.getElementById('call-remote-video');
  const videos = document.getElementById('call-videos');
  function stop() {
    const session = active; active = null;
    if (session) {
      clearTimeout(session.timer);
      session.pc.close(); stopMediaStream(session.stream);
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
    await request(event, { callId: session.id, ...value });
  }
  function start(call) {
    if (active?.id === call.id) return;
    stop();
    document.dispatchEvent(new CustomEvent('media:stop-preview'));
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const session = { id: call.id, pc, stream: null, remoteFlags: { camera: call.mode !== 'audio', mic: true }, candidates: [], queue: Promise.resolve() };
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
    session.timer = setTimeout(() => problem(session, new Error('No se pudo conectar en 45 segundos. Comprueba permisos y red; algunas redes requieren un servidor TURN.')), 45000);
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
      if (pc.connectionState === 'connected') { clearTimeout(session.timer); report(call.mode === 'audio' ? 'Llamada de audio conectada.' : 'Videollamada conectada.'); }
      if (pc.connectionState === 'disconnected') report('La conexión de video se interrumpió. Intentando recuperarla…');
      if (pc.connectionState === 'failed') problem(session, new Error('No se pudo establecer la conexión de video. Esta red puede requerir un servidor TURN.'));
    };
    session.ready = (async () => {
      const stream = await getLocalMedia({ video: call.mode !== 'audio' });
      if (active !== session) { stopMediaStream(stream); return; }
      session.stream = stream; local.srcObject = stream; controls.setStream(stream);
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        track.addEventListener('ended', () => problem(session, new Error('Se detuvo la cámara o el micrófono.')), { once: true });
      });
      await local.play();
      if (active !== session) return;
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
    if (!session || payload.callId !== session.id) return;
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
  return { start, stop };
}
