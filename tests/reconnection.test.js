const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { io } = require('socket.io-client');

test('reconexión: identidad, autoría, sesión firmada y reinicio del servidor', { timeout: 25000 }, async t => {
  let server;
  const clients = [];
  t.after(() => { clients.forEach(socket => socket.disconnect()); server?.kill(); });
  async function start() {
    server = spawn(process.execPath, ['server/server.js'], {
      env: { ...process.env, PORT: '3128', SESSION_SECRET: 'clave-exclusiva-para-la-prueba-de-reconexion' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await once(server.stdout, 'data');
  }
  async function stop() {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
  async function client() {
    const socket = io('http://localhost:3128', {
      transports: ['websocket'], autoConnect: false, reconnectionDelay: 100, reconnectionDelayMax: 200
    });
    clients.push(socket);
    const connected = once(socket, 'connect');
    socket.connect();
    await connected;
    return socket;
  }
  const request = (socket, event, payload) => socket.timeout(4000).emitWithAck(event, payload);
  await start();
  const a = await client();
  const initial = await request(a, 'user:join', { name: 'Noelia' });
  assert.equal(initial.ok, true);
  const messageEvent = once(a, 'message:new');
  await request(a, 'message:new', { content: 'Antes de la interrupción' });
  const [message] = await messageEvent;
  const b = await client();
  assert.equal((await request(b, 'user:join', { token: initial.token })).code, 'SESSION_ACTIVE');
  const [data, signature] = initial.token.split('.');
  const profile = JSON.parse(Buffer.from(data, 'base64url').toString());
  profile.name = 'Suplantación';
  const fake = Buffer.from(JSON.stringify(profile)).toString('base64url') + '.' + signature;
  assert.equal((await request(b, 'user:join', { token: fake })).code, 'SESSION_INVALID');
  assert.equal((await request(b, 'user:join', { token: 'inválido' })).code, 'SESSION_INVALID');
  // Una conexión nueva recupera la identidad anterior y los permisos del mensaje.
  const disconnected = once(a, 'disconnect');
  a.disconnect();
  await disconnected;
  // La petición viaja después de que el servidor procesa el cierre del primer socket.
  let resumed;
  for (let attempt = 0; attempt < 10; attempt++) {
    resumed = await request(b, 'user:join', { token: initial.token });
    if (resumed.ok) break;
    if (resumed.code !== 'SESSION_ACTIVE') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(resumed.ok, true);
  assert.equal(resumed.user.id, initial.user.id);
  assert.equal(resumed.messages[0].id, message.id);
  assert.equal((await request(b, 'message:edit', { id: message.id, content: 'Después de reconectar' })).ok, true);
  // La reconexión del transporte activa una nueva solicitud de recuperación.
  let token = resumed.token;
  const restored = new Promise((resolve, reject) => {
    b.once('connect', async () => {
      try {
        const presenceReady = once(b, 'users:update');
        const response = await request(b, 'user:join', { token });
        if (!response.ok) throw new Error(response.error);
        await presenceReady;
        token = response.token;
        resolve(response);
      } catch (error) { reject(error); }
    });
  });
  const lost = once(b, 'disconnect');
  await stop();
  await lost;
  await start();
  const afterRestart = await restored;
  assert.deepEqual(afterRestart.user, initial.user);
  assert.deepEqual(afterRestart.messages, []); // Historial temporal, no persistencia inventada.
  const presence = once(b, 'users:update');
  const c = await client();
  const joinedC = await request(c, 'user:join', { name: 'Andrea' });
  assert.equal((await presence)[0].length, 2);
  const privateEvent = once(c, 'private:message');
  assert.equal((await request(b, 'private:message', { recipientId: joinedC.user.id, content: 'Reconectada' })).ok, true);
  assert.equal((await privateEvent)[0].authorId, initial.user.id);
});
