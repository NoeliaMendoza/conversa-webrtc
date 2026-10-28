const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { io } = require('socket.io-client');
const { getRTCConfig } = require('../server/services/rtcConfigService');

test('TURN: configuración validada y credenciales temporales sin revelar el secreto', () => {
  const config = getRTCConfig({ id: 'usuario' }, { TURN_URLS: 'turn:relay.example:3478', TURN_SHARED_SECRET: 'test-only-secret', TURN_RELAY_ONLY: 'true' }, 1000000);
  assert.equal(config.iceTransportPolicy, 'relay');
  assert.equal(config.turnConfigured, true);
  assert.equal(config.iceServers[1].username, '4600:usuario');
  assert.equal(config.iceServers[1].credential, createHmac('sha1', 'test-only-secret').update('4600:usuario').digest('base64'));
  assert.ok(!JSON.stringify(config).includes('test-only-secret'));
  assert.equal(getRTCConfig({ id: 'usuario' }, {}).turnConfigured, false);
  assert.throws(() => getRTCConfig({ id: 'usuario' }, { TURN_RELAY_ONLY: 'true' }));
  assert.throws(() => getRTCConfig({ id: 'usuario' }, { TURN_URLS: 'https://relay.example' }));
  assert.throws(() => getRTCConfig({ id: 'usuario' }, { TURN_URLS: 'turn:relay.example' }));
});

test('llamada: recuperación firmada, negociación obsoleta y reinicio persistente', { timeout: 20000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conversa-call-recovery-'));
  const stateFile = path.join(dir, 'calls.json');
  const clients = []; let server;
  t.after(async () => {
    clients.forEach(s => s.disconnect());
    if (server && server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
    assert.ok(path.resolve(dir).startsWith(path.join(path.resolve(os.tmpdir()), 'conversa-call-recovery-')));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  async function startServer() {
    server = spawn(process.execPath, ['server/server.js'], { env: { ...process.env, PORT: '3142', SESSION_SECRET: 'call-recovery-test-only', CALL_STATE_FILE: stateFile, TURN_URLS: '', TURN_RELAY_ONLY: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await once(server.stdout, 'data');
  }
  const request = (s, event, payload = {}) => s.timeout(3000).emitWithAck(event, payload);
  async function join(name, token) {
    const s = io('http://localhost:3142', { transports: ['websocket'], autoConnect: false, reconnection: false });
    clients.push(s); const connected = once(s, 'connect'); s.connect(); await connected;
    const result = await request(s, 'user:join', token ? { token } : { name });
    assert.equal(result.ok, true); s.identity = result; return s;
  }
  await startServer();
  const a = await join('Noelia'), b = await join('Andrea'), c = await join('Mateo');
  assert.equal((await request(c, 'webrtc:config', { callId: 'unknown' })).ok, false);
  const call = (await request(a, 'call:start', { recipientId: b.identity.user.id })).call;
  await request(b, 'call:accept', { callId: call.id });
  assert.equal((await request(a, 'webrtc:config', { callId: call.id })).ok, true);
  assert.equal((await request(c, 'webrtc:config', { callId: call.id })).ok, false);
  const recovering = once(a, 'call:recovering'); b.disconnect(); await recovering;
  const waiting = await request(a, 'call:sync'); assert.equal(waiting.call.id, call.id); assert.ok(waiting.call.recoveryUntil > Date.now());
  const b2 = await join(null, b.identity.token);
  const accepted = once(a, 'call:accepted');
  const resumed = await request(b2, 'call:sync'); assert.equal(resumed.call.revision, 1); await accepted;
  assert.equal((await request(c, 'call:restart', { callId: call.id, revision: 1 })).ok, false);
  assert.equal((await request(a, 'webrtc:offer', { callId: call.id, revision: 0, description: { type: 'offer', sdp: 'v=0\r\n' } })).ok, false);
  const restarted = await request(a, 'call:restart', { callId: call.id, revision: 1 }); assert.equal(restarted.call.revision, 2);
  const stored = JSON.parse(fs.readFileSync(stateFile, 'utf8')); assert.equal(stored[0].id, call.id);
  assert.ok(!JSON.stringify(stored).includes('credential')); assert.ok(!JSON.stringify(stored).includes('sdp'));
  const stopped = once(server, 'exit'); server.kill(); await stopped;
  for (const socket of clients) socket.disconnect();
  await startServer();
  const a2 = await join(null, a.identity.token), b3 = await join(null, b.identity.token);
  const afterRestart = await request(a2, 'call:sync');
  assert.equal(afterRestart.call.id, call.id); assert.equal(afterRestart.call.revision, 3); assert.equal(afterRestart.call.recoveryUntil, undefined);
  assert.equal((await request(b3, 'call:end', { callId: call.id })).ok, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')), []);
  const chat = once(b3, 'message:new'); await request(a2, 'message:new', { content: 'Chat después de recuperar llamada' }); await chat;
});
