const users = require('../services/userService');

module.exports = function registerPrivateTyping(io, socket) {
  let active = null;
  let timer;
  function stop() {
    clearTimeout(timer);
    if (active) io.to(active.recipientId).emit('private:typing:stop', { id: active.id });
    active = null;
  }
  socket.on('private:typing:start', payload => {
    const user = users.getUser(socket.id);
    const recipient = users.getUserById(payload?.recipientId);
    if (!user || !recipient || user.id === recipient.id) return;
    if (active?.recipientId !== recipient.id) {
      stop(); active = { id: user.id, recipientId: recipient.id };
      io.to(recipient.id).emit('private:typing:start', { id: user.id, name: user.name });
    }
    clearTimeout(timer); timer = setTimeout(stop, 3000);
  });
  socket.on('private:typing:stop', stop);
  socket.on('private:message', stop);
  socket.on('disconnect', stop);
};
