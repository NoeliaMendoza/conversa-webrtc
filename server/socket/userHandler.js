const users = require('../services/userService');
const messages = require('../services/messageService');
const { issueSession } = require('../services/sessionService');
const { getPinned } = require('../services/pinService');

module.exports = function registerUserHandlers(io, socket) {
  socket.on('user:join', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      if (users.getUser(socket.id)) throw new Error('Ya ingresaste al chat.');
      const user = users.addUser(socket.id, payload?.name, payload?.token);
      socket.join('general');
      socket.join(user.id);
      respond({ ok: true, user, token: issueSession(user), messages: messages.listMessages(), pinned: getPinned() });
      io.to('general').emit('users:update', users.listUsers());
      io.to('general').emit('presence:update', users.listPresence());
      io.to('general').emit('user:join', { name: user.name, at: new Date().toISOString() });
    } catch (error) { respond({ ok: false, error: error.message, code: error.code }); }
  });

  socket.on('disconnect', () => {
    const user = users.getUser(socket.id);
    if (!user) return;
    users.removeUser(socket.id);
    io.to('general').emit('users:update', users.listUsers());
    io.to('general').emit('presence:update', users.listPresence());
    io.to('general').emit('user:leave', { name: user.name, at: new Date().toISOString() });
  });
};
