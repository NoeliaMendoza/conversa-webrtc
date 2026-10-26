const users = require('../services/userService');
const { listMessages } = require('../services/messageService');

module.exports = function registerSearchHandlers(_io, socket) {
  // Reto 12: solo historial grupal disponible, sin consultar conversaciones privadas.
  socket.on('message:search', (payload, reply) => {
    const respond = typeof reply === 'function' ? reply : () => {};
    try {
      if (!users.getUser(socket.id)) throw new Error('Primero ingresa al chat.');
      const query = payload?.query;
      if (typeof query !== 'string' || query.trim().length < 2 || query.trim().length > 100) {
        throw new Error('Escribe entre 2 y 100 caracteres para buscar.');
      }
      const term = query.trim().toLocaleLowerCase('es');
      const matches = listMessages().filter(message => !message.deletedAt && message.content.toLocaleLowerCase('es').includes(term));
      respond({ ok: true, total: matches.length, messages: matches.slice(-50).reverse().map(({ id, author, content, createdAt }) => ({ id, author, content, createdAt })) });
    } catch (error) { respond({ ok: false, error: error.message }); }
  });
};
