const users = require('../services/userService');
const pins = require('../services/pinService');

module.exports = function registerPinHandlers(io, socket) {
  // Reto 13: cualquier participante puede fijar o quitar el destacado grupal.
  function register(event, action) {
    socket.on(event, (payload, reply) => {
      const respond = typeof reply === 'function' ? reply : () => {};
      try {
        const user = users.getUser(socket.id);
        if (!user) throw new Error('Primero ingresa al chat.');
        const state = action(user, payload?.id);
        io.to('general').emit('pin:update', state);
        respond({ ok: true });
      } catch (error) { respond({ ok: false, error: error.message }); }
    });
  }
  register('message:pin', pins.pinMessage);
  register('message:unpin', (_user, id) => pins.unpinMessage(id));
};
