import { on, request } from './socket.js';

import { setupCallView } from './callView.js';
import { setupPeerCall } from './peerCall.js';
export function setupCalls(getCurrentUser) {
  const byId = id => document.getElementById(id);
  const panel = byId('call-panel');
  const view = setupCallView();
  let returnFocus = null;
  let current = null;
  let busy = false;
  let generation = 0;
  const peer = setupPeerCall(getCurrentUser,
    text => { byId('call-status').textContent = text; },
    async message => {
      const callId = current?.id;
      if (callId) {
        try { await request('call:end', { callId }); }
        catch { if (current?.id === callId) render({ ...current, status: 'ended' }); }
      }
      if (current?.id === callId) view.error(message);
    }, view);

  function render(call) {
    const newlyOpened = panel.hidden;
    current = call; panel.hidden = false;
    view.show(call, getCurrentUser());
    if (newlyOpened) { returnFocus = document.activeElement; if (call.caller.id === getCurrentUser()?.id) panel.focus({ preventScroll: true }); }
    const incoming = call.recipient.id === getCurrentUser()?.id;

    const kind = call.mode === 'audio' ? 'llamada de audio' : 'videollamada';
    byId('call-title').textContent = call.status === 'accepted' ? (call.mode === 'audio' ? 'Llamada de audio' : 'Videollamada') : call.status === 'ended' ? 'Llamada finalizada' : incoming ? (call.mode === 'audio' ? 'Llamada entrante' : 'Videollamada entrante') : 'Solicitando ' + kind;
    byId('call-status').textContent = call.status === 'accepted'
      ? 'Conectando audio y video…'
      : call.status === 'ended' ? ({ rejected: 'La solicitud fue rechazada.', timeout: 'No hubo respuesta en 30 segundos.', disconnected: 'Uno de los participantes se desconectó.' }[call.reason] || 'La solicitud terminó. El chat sigue disponible.')
      : incoming ? `${call.caller.name} desea iniciar una ${kind} contigo.` : 'Esperando que la otra persona acepte…';
    byId('call-accept').hidden = byId('call-reject').hidden = !(incoming && call.status === 'pending');
    byId('call-end').hidden = call.status === 'ended' || incoming && call.status === 'pending';
    byId('call-end').lastElementChild.textContent = call.status === 'accepted' ? 'Finalizar llamada' : 'Cancelar solicitud';
    byId('call-dismiss').hidden = call.status !== 'ended';
    view.error('');
    panel.classList.toggle('call-panel-active', call.status === 'accepted');
    view.refresh();
    if (call.status === 'ended') peer.stop();
    if (call.status === 'accepted') {
      try { peer.start(call); }
      catch (error) { peer.stop(); view.error(error.message); request('call:end', { callId: call.id }).catch(() => {}); }
    }
  }
  async function perform(event) {
    if (!current || busy) return;
    busy = true;
    try { await request(event, { callId: current.id }); }
    catch (error) { view.error(error.message); }
    finally { busy = false; }
  }
  byId('users').addEventListener('click', async event => {
    const button = event.target.closest('[data-call-user]');
    if (!button || !getCurrentUser() || busy) return;
    if (current && current.status !== 'ended') { panel.hidden = false; view.restore(); return; }
    busy = true; const attempt = generation;
    try {
      const response = await request('call:start', { recipientId: button.dataset.callUser, mode: button.dataset.callMode || 'video' });
      if (attempt === generation && current?.id !== response.call.id) render(response.call);
      document.dispatchEvent(new CustomEvent('workspace:close-panels'));
    } catch (error) { byId('feedback').textContent = error.message; }
    finally { busy = false; }
  });
  byId('call-accept').addEventListener('click', () => perform('call:accept'));
  byId('call-reject').addEventListener('click', () => perform('call:reject'));
  byId('call-end').addEventListener('click', () => perform('call:end'));
  byId('call-dismiss').addEventListener('click', () => { panel.hidden = true; current = null; if (returnFocus?.isConnected) returnFocus.focus(); });
  ['call:incoming', 'call:accepted', 'call:rejected', 'call:ended'].forEach(event => on(event, render));
  on('disconnect', () => {
    generation++; busy = false;
    if (current && current.status !== 'ended') render({ ...current, status: 'ended', reason: 'disconnected' });
  });
}
