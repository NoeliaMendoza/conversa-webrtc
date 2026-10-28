const { randomUUID } = require('node:crypto');
const store = require('./callStore');
const calls = new Map();
const byUser = new Map();
for (const call of store.load()) { calls.set(call.id, call); byUser.set(call.caller.id, call.id); byUser.set(call.recipient.id, call.id); }
function persist() { store.save([...calls.values()]); }

function start(caller, recipient, mode = 'video') {
  if (!['video', 'audio'].includes(mode)) throw new Error('Tipo de llamada inválido.');
  if (!recipient) throw new Error('El usuario ya no está conectado.');
  if (caller.id === recipient.id) throw new Error('Selecciona a otra persona.');
  if (byUser.has(caller.id) || byUser.has(recipient.id)) throw new Error('Uno de los usuarios ya tiene una solicitud de llamada.');
  const call = {
    id: randomUUID(), caller: { id: caller.id, name: caller.name },
    recipient: { id: recipient.id, name: recipient.name }, status: 'pending', mode, revision: 0
  };
  calls.set(call.id, call);
  byUser.set(caller.id, call.id); byUser.set(recipient.id, call.id);
  return call;
}
function getFor(user, id) {
  const call = calls.get(id);
  if (!call || ![call.caller.id, call.recipient.id].includes(user.id)) throw new Error('La solicitud no está disponible.');
  return call;
}
function accept(user, id) {
  const call = getFor(user, id);
  if (call.recipient.id !== user.id || call.status !== 'pending') throw new Error('Solo el destinatario puede aceptar una solicitud pendiente.');
  call.status = 'accepted'; call.updatedAt = Date.now();
  try { persist(); } catch (error) { call.status = 'pending'; throw error; }
  return call;
}
function finish(user, id, reason = 'ended') {
  const call = getFor(user, id);
  if (reason === 'rejected' && (call.recipient.id !== user.id || call.status !== 'pending')) throw new Error('No puedes rechazar esta solicitud.');
  calls.delete(id);
  try { persist(); } catch (error) { calls.set(id, call); throw error; }
  byUser.delete(call.caller.id); byUser.delete(call.recipient.id);
  return { ...call, status: 'ended', reason };
}
function suspend(user) {
  const call = calls.get(byUser.get(user.id));
  if (!call || call.status !== 'accepted') return call;
  call.recoveryUntil = Date.now() + 30000; call.updatedAt = Date.now(); persist(); return call;
}
function resume(user, id) {
  const call = getFor(user, id);
  if (call.status !== 'accepted') throw new Error('La llamada no está aceptada.');
  call.revision++; delete call.recoveryUntil; call.updatedAt = Date.now(); persist(); return call;
}
module.exports = { start, accept, finish, getFor, suspend, resume, list: () => [...calls.values()], forUser: id => calls.get(byUser.get(id)) };
