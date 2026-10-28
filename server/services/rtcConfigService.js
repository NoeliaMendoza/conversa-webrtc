const { createHmac } = require('node:crypto');
function getRTCConfig(user, env = process.env, now = Date.now()) {
  const urls = (env.TURN_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (urls.some(url => !/^turns?:[^\s]+$/.test(url))) throw new Error('TURN_URLS debe contener direcciones turn: o turns:.');
  const iceServers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (urls.length) {
    let username, credential;
    if (env.TURN_SHARED_SECRET) {
      username = Math.floor(now / 1000 + 3600) + ':' + user.id;
      credential = createHmac('sha1', env.TURN_SHARED_SECRET).update(username).digest('base64');
    } else { username = env.TURN_USERNAME; credential = env.TURN_CREDENTIAL; }
    if (!username || !credential) throw new Error('Configura las credenciales del servicio TURN en el servidor.');
    iceServers.push({ urls, username, credential });
  }
  const relay = env.TURN_RELAY_ONLY === 'true';
  if (relay && !urls.length) throw new Error('TURN_RELAY_ONLY requiere un servicio TURN configurado.');
  return { iceServers, iceTransportPolicy: relay ? 'relay' : 'all', turnConfigured: urls.length > 0 };
}
module.exports = { getRTCConfig };
