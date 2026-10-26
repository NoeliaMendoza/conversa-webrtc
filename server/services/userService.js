const users = new Map();
const presence = new Map();
const { readSession, newIdentity } = require('./sessionService');

function addUser(socketId, name, token) {
  const identity = token ? readSession(token) : null;
  if (identity) name = identity.name;
  if (typeof name !== 'string') throw new Error('Ingresa un nombre válido.');
  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (cleanName.length < 2 || cleanName.length > 30) {
    throw new Error('El nombre debe tener entre 2 y 30 caracteres.');
  }
  if (identity && [...users.values()].some(user => user.id === identity.id)) {
    throw Object.assign(new Error('Esperando que termine la conexión anterior…'), { code: 'SESSION_ACTIVE' });
  }
  if ([...users.values()].some(user => user.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
    throw new Error('Ese nombre ya está conectado. Elige otro.');
  }
  const user = { ...(identity || newIdentity(cleanName)), status: 'online' };
  users.set(socketId, user);
  presence.set(user.id, user);
  return user;
}

function removeUser(socketId) {
  const user = users.get(socketId);
  if (!user) return;
  users.delete(socketId);
  // Reto 8: hora del servidor al detectar la desconexión, no del dispositivo cliente.
  presence.set(user.id, { ...user, status: 'offline', disconnectedAt: new Date().toISOString() });
  const offline = [...presence.values()].filter(user => user.status === 'offline');
  offline.slice(0, Math.max(0, offline.length - 100)).forEach(user => presence.delete(user.id));
}

// Reto 14: el estado Desconectado se determina exclusivamente en el servidor.
function setPresence(socketId, status) {
  const user = users.get(socketId);
  if (!user) throw new Error('Primero ingresa al chat.');
  if (!['online', 'away'].includes(status)) throw new Error('Estado de presencia no permitido.');
  user.status = status;
  return user;
}

module.exports = {
  addUser,
  getUser: id => users.get(id),
  getUserById: id => [...users.values()].find(user => user.id === id),
  removeUser,
  setPresence,
  listPresence: () => [...presence.values()],
  listUsers: () => [...users.values()]
};
