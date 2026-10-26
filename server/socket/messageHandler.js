const users = require('../services/userService');
const messages = require('../services/messageService');
const { getPinned } = require('../services/pinService');

module.exports = function registerMessageHandlers(io, socket) {
  // Reto 4: la autoría se valida en el servidor, nunca desde datos del cliente.
  socket.on('message:delete', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      const user = users.getUser(socket.id);
      if (!user) throw new Error('Primero ingresa al chat.');
      const wasPinned = getPinned()?.message.id === payload?.id;
      const message = messages.deleteMessage(user, payload?.id);
      io.to('general').emit('message:delete', message);
      if (wasPinned) io.to('general').emit('pin:update', getPinned());
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });

  socket.on('message:edit', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      const user = users.getUser(socket.id);
      if (!user) throw new Error('Primero ingresa al chat.');
      const message = messages.editMessage(user, payload?.id, payload?.content);
      io.to('general').emit('message:edit', message);
      if (getPinned()?.message.id === message.id) io.to('general').emit('pin:update', getPinned());
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });

  socket.on('message:new', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      const user = users.getUser(socket.id);
      if (!user) throw new Error('Primero ingresa al chat.');
      const previousPin = getPinned();
      const message = messages.createMessage(user, payload?.content, payload?.replyTo);
      io.to('general').emit('message:new', message);
      if (previousPin && !getPinned()) io.to('general').emit('pin:update', null);
      respond({ ok: true });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });
};
