const users = require('../services/userService');
const calls = require('../services/callService');
const timeouts = new Map();

module.exports = function registerCallHandlers(io, socket) {
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
  // La identidad y el destino se resuelven en el servidor, nunca desde el payload.
  for (const event of ['webrtc:offer', 'webrtc:answer', 'webrtc:ice-candidate']) {
    register(event, (user, payload) => {
      const call = calls.getFor(user, payload?.callId);
      if (call.status !== 'accepted') throw new Error('Primero deben aceptar la llamada.');
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
      io.to(isCaller ? call.recipient.id : call.caller.id).emit(event, { callId: call.id, ...value });
      return call;
    });
  }
  socket.on('disconnecting', () => {
    const user = users.getUser(socket.id);
    const call = user && calls.forUser(user.id);
    if (!call) return;
    clearExpiry(call.id);
    emitBoth('call:ended', calls.finish(user, call.id, 'disconnected'));
  });
};
