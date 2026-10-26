const { getMessage } = require('./messageService');

// Reto 13: un único destacado compartido, mantenido en memoria por el servidor.
let pin = null;
function getPinned() {
  const message = pin && getMessage(pin.id);
  if (!message || message.deletedAt) { pin = null; return null; }
  return { message, pinnedBy: pin.pinnedBy, pinnedAt: pin.pinnedAt };
}
function pinMessage(user, id) {
  const message = getMessage(id);
  if (!message || message.deletedAt) throw new Error('No se puede fijar ese mensaje.');
  pin = { id, pinnedBy: user.name, pinnedAt: new Date().toISOString() };
  return getPinned();
}
function unpinMessage(id) {
  if (!pin || pin.id !== id) throw new Error('El mensaje fijado cambió. Revisa el destacado actual.');
  pin = null;
  return null;
}
module.exports = { getPinned, pinMessage, unpinMessage };
