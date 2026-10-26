const users = require('../services/userService');
const service = require('../services/privateMessageService');

module.exports = function registerPrivateMessageHandlers(io, socket) {
  // Reto 6: envío a las dos conexiones participantes, sin difusión al grupo.
  socket.on('private:message', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      const sender = users.getUser(socket.id);
      if (!sender) throw new Error('Primero ingresa al chat.');
      const message = service.createPrivateMessage(sender, payload?.recipientId, payload?.content, payload?.replyTo);
      io.to(sender.id).to(message.recipientId).emit('private:message', message);
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });
  function register(event, action) {
    socket.on(event, (payload, reply) => {
      const respond = typeof reply === 'function' ? reply : () => {};
      try {
        const user = users.getUser(socket.id);
        if (!user) throw new Error('Primero ingresa al chat.');
        const message = action(user, payload);
        io.to(message.authorId).to(message.recipientId).emit(event, message);
        respond({ ok: true });
      } catch (error) { respond({ ok: false, error: error.message }); }
    });
  }
  register('private:edit', (user, payload) => service.change(user, payload?.id, 'edit', payload?.content));
  register('private:delete', (user, payload) => service.change(user, payload?.id, 'delete'));
  register('private:reaction', (user, payload) => service.change(user, payload?.id, 'reaction', payload?.emoji));
  register('private:received', (user, payload) => service.receipt(user, payload?.id, false));
  register('private:read', (user, payload) => service.receipt(user, payload?.id, true));
};
