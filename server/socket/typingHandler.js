const users = require('../services/userService');

// Reto 1: presencia temporal de escritura, sin almacenar contenido del borrador.
module.exports = function registerTypingHandlers(io, socket) {
  let timer;
  let writing = false;
  let writerId;

  function stop() {
    clearTimeout(timer);
    if (!writing) return;
    writing = false;
    socket.to('general').emit('typing:stop', { id: writerId });
  }

  socket.on('typing:start', () => {
    const user = users.getUser(socket.id);
    if (!user) return;
    if (!writing) {
      writerId = user.id;
      writing = true;
      socket.to('general').emit('typing:start', { id: user.id, name: user.name });
    }
    clearTimeout(timer);
    // Caducidad de respaldo si el cliente no envía typing:stop.
    timer = setTimeout(stop, 3000);
  });
  socket.on('typing:stop', stop);
  socket.on('disconnect', stop);
};
