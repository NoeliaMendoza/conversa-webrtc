const { randomBytes, randomUUID, createHmac, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Reto 9: identidad firmada independiente del identificador de conexión.
const keyPath = path.join(__dirname, '../../.data/session-key');
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  try { fs.writeFileSync(keyPath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return fs.readFileSync(keyPath, 'utf8');
}
const secret = loadSecret();
const sign = data => createHmac('sha256', secret).update(data).digest('base64url');

function issueSession(user) {
  const data = Buffer.from(JSON.stringify({ ...user, expiresAt: Date.now() + 7 * 86400000 })).toString('base64url');
  return `${data}.${sign(data)}`;
}

function readSession(token) {
  try {
    if (typeof token !== 'string' || token.length > 2048) throw new Error();
    const parts = token.split('.');
    if (parts.length !== 2) throw new Error();
    const expected = Buffer.from(sign(parts[0]));
    const received = Buffer.from(parts[1]);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw new Error();
    const user = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (typeof user.id !== 'string' || typeof user.name !== 'string' || !(user.expiresAt > Date.now())) throw new Error();
    return { id: user.id, name: user.name };
  } catch {
    throw Object.assign(new Error('La sesión ya no es válida. Ingresa nuevamente.'), { code: 'SESSION_INVALID' });
  }
}

module.exports = { issueSession, readSession, newIdentity: name => ({ id: randomUUID(), name }) };
