const { randomUUID } = require('node:crypto');
const reactionEmojis = require('../../public/js/reactionEmojis');
const messages = [];

function validateContent(content) {
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
    throw new Error('Escribe un mensaje de entre 1 y 2000 caracteres.');
  }
  return content.trim();
}

function createMessage(user, content, replyTo) {
  const cleanContent = validateContent(content);
  // Reto 11: la cita se obtiene del servidor; el cliente solo indica el ID.
  let reply;
  if (replyTo != null) {
    const original = messages.find(message => message.id === replyTo && !message.deletedAt);
    if (!original) throw new Error('El mensaje que quieres responder ya no está disponible.');
    reply = { id: original.id, author: original.author, content: original.content.slice(0, 180) };
  }
  const message = {
    id: randomUUID(), authorId: user.id, author: user.name,
    content: cleanContent, createdAt: new Date().toISOString(), reactions: {},
    ...(reply ? { reply } : {})
  };
  messages.push(message);
  if (messages.length > 200) messages.shift();
  return message;
}

function editMessage(user, id, content) {
  const message = messages.find(message => message.id === id);
  if (!message) throw new Error('El mensaje ya no está disponible.');
  if (message.deletedAt) throw new Error('El mensaje fue eliminado.');
  if (message.authorId !== user.id) throw new Error('Solo puedes editar tus propios mensajes.');
  message.content = validateContent(content);
  message.editedAt = new Date().toISOString();
  for (const response of messages) {
    if (response.reply?.id === id) response.reply.content = message.content.slice(0, 180);
  }
  return message;
}

// Reto 3: una reacción por usuario y mensaje; elegir otra reemplaza la anterior.
function toggleReaction(user, id, emoji) {
  if (!reactionEmojis.includes(emoji)) throw new Error('Reacción no permitida.');
  const message = messages.find(message => message.id === id);
  if (!message) throw new Error('El mensaje ya no está disponible.');
  if (message.deletedAt) throw new Error('El mensaje fue eliminado.');
  const selected = message.reactions[emoji]?.includes(user.id);
  for (const key of Object.keys(message.reactions)) {
    message.reactions[key] = message.reactions[key].filter(id => id !== user.id);
    if (!message.reactions[key].length) delete message.reactions[key];
  }
  if (!selected) message.reactions[emoji] = [...(message.reactions[emoji] || []), user.id];
  return { id: message.id, reactions: message.reactions };
}

// Reto 4: conservar una marca de eliminación para sincronizar historial e interfaz.
function deleteMessage(user, id) {
  const message = messages.find(message => message.id === id);
  if (!message) throw new Error('El mensaje ya no está disponible.');
  if (message.authorId !== user.id) throw new Error('Solo puedes eliminar tus propios mensajes.');
  if (message.deletedAt) throw new Error('El mensaje ya fue eliminado.');
  message.content = '';
  message.reactions = {};
  delete message.editedAt;
  message.deletedAt = new Date().toISOString();
  delete message.reply;
  for (const response of messages) {
    if (response.reply?.id === id) {
      response.reply.content = 'Mensaje eliminado';
      response.reply.deleted = true;
    }
  }
  return message;
}

module.exports = { validateContent, createMessage, editMessage, deleteMessage, toggleReaction, getMessage: id => messages.find(message => message.id === id), listMessages: () => [...messages] };
