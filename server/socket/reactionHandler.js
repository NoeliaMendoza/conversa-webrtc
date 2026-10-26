const users = require('../services/userService');
const messages = require('../services/messageService');

// Reto 3: identidad tomada de la conexión y resultado difundido al grupo.
module.exports = function registerReactionHandlers(io, socket) {
  socket.on('reaction:toggle', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      const user = users.getUser(socket.id);
      if (!user) throw new Error('Primero ingresa al chat.');
      const result = messages.toggleReaction(user, payload?.id, payload?.emoji);
      io.to('general').emit('reaction:update', result);
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });
};
