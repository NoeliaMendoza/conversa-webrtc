const users = require('../services/userService');
const calls = require('../services/callService');
const timeouts = new Map();
const { getRTCConfig } = require('../services/rtcConfigService');
let cleanupStarted = false;
const connectedPair = call => users.getUserById(call.caller.id) && users.getUserById(call.recipient.id);

module.exports = function registerCallHandlers(io, socket) {
  if (!cleanupStarted) {
    cleanupStarted = true;
    const cleanup = setInterval(() => {
      for (const call of calls.list()) if (call.recoveryUntil && call.recoveryUntil <= Date.now()) {
        try { const ended = calls.finish(call.caller, call.id, 'disconnected'); io.to(call.caller.id).to(call.recipient.id).emit('call:ended', ended); }
        catch { console.warn('No se pudo cerrar una llamada vencida.'); }
      }
    }, 1000); cleanup.unref();
  }
  const emitBoth = (event, call) => io.to(call.caller.id).to(call.recipient.id).emit(event, call);
  function clearExpiry(id) { clearTimeout(timeouts.get(id)); timeouts.delete(id); }
  function register(event, action) {
    socket.on(event, (payload, reply) => {
      const respond = typeof reply === 'function' ? reply : () => {};
      try {
        const user = users.getUser(socket.id);
        if (!user) throw new Error('Primero ingresa al chat.');
        const call = action(user, payload);
        respond({ ok: true, call });
      } catch (error) { respond({ ok: false, error: error.message }); }
    });
  }
  register('call:start', (user, payload) => {
    const call = calls.start(user, users.getUserById(payload?.recipientId), payload?.mode);
    io.to(call.recipient.id).emit('call:incoming', call);
    const timeout = setTimeout(() => {
      timeouts.delete(call.id);
      if (calls.forUser(user.id)?.id === call.id) emitBoth('call:ended', calls.finish(user, call.id, 'timeout'));
    }, 30000);
    timeout.unref(); timeouts.set(call.id, timeout);
    return call;
  });
  register('call:accept', (user, payload) => {
    const call = calls.accept(user, payload?.callId);
    clearExpiry(call.id); emitBoth('call:accepted', call);
    return call;
  });
  register('call:reject', (user, payload) => {
    const call = calls.finish(user, payload?.callId, 'rejected');
    clearExpiry(call.id); emitBoth('call:rejected', call);
    return call;
  });
  register('call:end', (user, payload) => {
    const call = calls.finish(user, payload?.callId);
    clearExpiry(call.id); emitBoth('call:ended', call);
    return call;
  });
  socket.on('webrtc:config', (payload, reply) => {
    if (typeof reply !== 'function') return;
    try {
      const user = users.getUser(socket.id);
      if (!user || calls.getFor(user, payload?.callId).status !== 'accepted') throw new Error('No hay una llamada aceptada.');
      const config = getRTCConfig(user); reply({ ok: true, config });
    } catch (error) { reply({ ok: false, error: error.message }); }
  });
  register('call:sync', user => {
    const call = calls.forUser(user.id);
    if (!call) return null;
    if (call.recoveryUntil && call.recoveryUntil <= Date.now()) {
      emitBoth('call:ended', calls.finish(user, call.id, 'disconnected')); return null;
    }
    if (call.recoveryUntil && connectedPair(call)) {
      const resumed = calls.resume(user, call.id); emitBoth('call:accepted', resumed); return resumed;
    }
    return call;
  });
  register('call:restart', (user, payload) => {
    const call = calls.getFor(user, payload?.callId);
    if (!connectedPair(call)) throw new Error('Esperando que ambos participantes recuperen la conexión.');
    if (payload?.revision !== call.revision) return call;
    if (call.lastRestartAt && Date.now() - call.lastRestartAt < 4000) return call;
    const resumed = calls.resume(user, call.id); resumed.lastRestartAt = Date.now();
    emitBoth('call:accepted', resumed); return resumed;
  });
  // La identidad y el destino se resuelven en el servidor, nunca desde el payload.
  for (const event of ['webrtc:offer', 'webrtc:answer', 'webrtc:ice-candidate']) {
    register(event, (user, payload) => {
      const call = calls.getFor(user, payload?.callId);
      if (call.status !== 'accepted') throw new Error('Primero deben aceptar la llamada.');
      if ((payload.revision ?? 0) !== call.revision) throw new Error('La negociación anterior ya no está vigente.');
      const isCaller = call.caller.id === user.id;
      let value;
      if (event === 'webrtc:ice-candidate') {
        const candidate = payload?.candidate;
        if (!candidate || typeof candidate.candidate !== 'string' || candidate.candidate.length > 4096
          || candidate.sdpMid != null && typeof candidate.sdpMid !== 'string'
          || candidate.sdpMLineIndex != null && !Number.isInteger(candidate.sdpMLineIndex)) throw new Error('Candidato ICE inválido.');
        value = { candidate: { candidate: candidate.candidate, sdpMid: candidate.sdpMid ?? null, sdpMLineIndex: candidate.sdpMLineIndex ?? null } };
      } else {
        const type = event === 'webrtc:offer' ? 'offer' : 'answer';
        const description = payload?.description;
        if ((type === 'offer') !== isCaller || description?.type !== type || typeof description.sdp !== 'string'
          || !description.sdp.startsWith('v=0') || description.sdp.length > 14000) throw new Error('Descripción de sesión inválida.');
        value = { description: { type, sdp: description.sdp } };
      }
      io.to(isCaller ? call.recipient.id : call.caller.id).emit(event, { callId: call.id, revision: call.revision, ...value });
      return call;
    });
  }
  socket.on('disconnecting', () => {
    const user = users.getUser(socket.id);
    const call = user && calls.forUser(user.id);
    if (!call) return;
    clearExpiry(call.id);
    if (call.status === 'accepted') { calls.suspend(user); emitBoth('call:recovering', call); }
    else emitBoth('call:ended', calls.finish(user, call.id, 'disconnected'));
  });
};
