const users = require('../services/userService');

// Reto 14: el cliente solo puede cambiar su propia presencia.
module.exports = function registerPresenceHandlers(io, socket) {
  socket.on('presence:set', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      users.setPresence(socket.id, payload?.status);
      io.to('general').emit('presence:update', users.listPresence());
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });
};
