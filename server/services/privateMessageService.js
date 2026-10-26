const { randomUUID } = require('node:crypto');
const users = require('./userService');
const { validateContent } = require('./messageService');
const emojis = require('../../public/js/reactionEmojis');
const threads = new Map();
const keyFor = (a, b) => [a, b].sort().join(':');

function locate(user, id) {
  for (const messages of threads.values()) {
    const message = messages.find(item => item.id === id);
    if (message) {
      if (![message.authorId, message.recipientId].includes(user.id)) break;
      return { message, messages };
    }
  }
  throw new Error('El mensaje privado no está disponible.');
}
function createPrivateMessage(sender, recipientId, content, replyTo) {
  const recipient = users.getUserById(recipientId);
  if (!recipient) throw new Error('El destinatario ya no está conectado.');
  if (sender.id === recipient.id) throw new Error('Selecciona a otra persona.');
  const key = keyFor(sender.id, recipient.id);
  const messages = threads.get(key) || [];
  let reply;
  if (replyTo != null) {
    const original = messages.find(item => item.id === replyTo && !item.deletedAt);
    if (!original) throw new Error('No se puede responder a ese mensaje en esta conversación.');
    reply = { id: original.id, author: original.author, content: original.content.slice(0, 180) };
  }
  const message = {
    id: randomUUID(), authorId: sender.id, author: sender.name,
    recipientId: recipient.id, recipient: recipient.name,
    content: validateContent(content), createdAt: new Date().toISOString(), reactions: {},
    ...(reply ? { reply } : {})
  };
  messages.push(message);
  if (messages.length > 200) messages.shift();
  threads.set(key, messages);
  if (threads.size > 100) threads.delete(threads.keys().next().value);
  return message;
}
function change(user, id, action, value) {
  const { message, messages } = locate(user, id);
  if (message.deletedAt) throw new Error('El mensaje fue eliminado.');
  if (['edit', 'delete'].includes(action) && message.authorId !== user.id) throw new Error('Solo puedes modificar tus propios mensajes.');
  if (action === 'edit') {
    message.content = validateContent(value);
    message.editedAt = new Date().toISOString();
  } else if (action === 'delete') {
    message.content = ''; message.reactions = {}; message.deletedAt = new Date().toISOString();
    delete message.reply; delete message.editedAt;
  } else if (action === 'reaction') {
    if (!emojis.includes(value)) throw new Error('Reacción no permitida.');
    const selected = message.reactions[value]?.includes(user.id);
    for (const emoji of Object.keys(message.reactions)) {
      message.reactions[emoji] = message.reactions[emoji].filter(id => id !== user.id);
      if (!message.reactions[emoji].length) delete message.reactions[emoji];
    }
    if (!selected) message.reactions[value] = [...(message.reactions[value] || []), user.id];
  }
  if (['edit', 'delete'].includes(action)) for (const item of messages) {
    if (item.reply?.id === id) {
      item.reply.content = message.deletedAt ? 'Mensaje eliminado' : message.content.slice(0, 180);
      item.reply.deleted = !!message.deletedAt;
    }
  }
  return message;
}
// Reto 2: recibido requiere acuse del destinatario; leído requiere un evento posterior del cliente visible.
function receipt(user, id, read) {
  const { message } = locate(user, id);
  if (message.recipientId !== user.id) throw new Error('Solo el destinatario puede confirmar la recepción.');
  message.deliveredAt ||= new Date().toISOString();
  if (read) message.readAt ||= new Date().toISOString();
  return message;
}
module.exports = { createPrivateMessage, change, receipt };
