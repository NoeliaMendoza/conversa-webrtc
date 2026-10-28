const fs = require('node:fs');
const path = require('node:path');
// Solo metadatos de llamadas aceptadas. Nunca se guarda audio, video, SDP ni credenciales.
const file = process.env.CALL_STATE_FILE === ':memory:' ? null : path.resolve(process.env.CALL_STATE_FILE || path.join(__dirname, '../../.data/calls.json'));
function load() {
  if (!file) return [];
  try {
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(rows)) throw new Error('Formato de llamadas inválido.');
    const seen = new Set();
    return rows.slice(0, 1000).filter(call => {
      const valid = call?.status === 'accepted' && typeof call.id === 'string' && call.id.length < 100
        && ['audio', 'video'].includes(call.mode) && Number.isInteger(call.revision) && call.revision >= 0
        && [call.caller, call.recipient].every(u => typeof u?.id === 'string' && u.id.length < 100 && typeof u.name === 'string' && u.name.length <= 40)
        && call.caller.id !== call.recipient.id && !seen.has(call.caller.id) && !seen.has(call.recipient.id)
        && Number.isFinite(call.updatedAt) && Date.now() - call.updatedAt < 7 * 86400000
        && (!call.recoveryUntil || call.recoveryUntil > Date.now());
      if (valid) { seen.add(call.caller.id); seen.add(call.recipient.id); } return valid;
    }).map(call => ({ id: call.id, caller: { id: call.caller.id, name: call.caller.name }, recipient: { id: call.recipient.id, name: call.recipient.name }, mode: call.mode, status: 'accepted', revision: call.revision, updatedAt: call.updatedAt, recoveryUntil: Date.now() + 30000 }));
  } catch (error) { if (error.code !== 'ENOENT') console.warn('No se pudo recuperar el estado de llamadas; se iniciará vacío.'); return []; }
}
function save(calls) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(calls.filter(c => c.status === 'accepted')), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
module.exports = { load, save };
