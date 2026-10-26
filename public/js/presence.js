import { on, request } from './socket.js';

// Reto 14: ausencia por pestaña oculta/sin foco o un minuto de inactividad.
export function setupPresence(getCurrentUser) {
  let timer;
  let lastActivity = Date.now();
  let published = null;
  let pending = false;
  const desired = () => document.hidden || !document.hasFocus() || Date.now() - lastActivity >= 60000 ? 'away' : 'online';

  async function publish() {
    const self = getCurrentUser();
    if (!self || pending) return;
    const status = desired();
    if (status === published) return;
    pending = true;
    try {
      await request('presence:set', { status });
      if (getCurrentUser()?.id === self.id) published = status;
    } catch { /* El siguiente evento de actividad vuelve a intentar; la desconexión se gestiona por separado. */ }
    finally {
      pending = false;
      if (getCurrentUser() && desired() !== status) publish();
    }
  }
  function activity() {
    lastActivity = Date.now();
    clearTimeout(timer);
    timer = setTimeout(publish, 60000);
    publish();
  }
  document.addEventListener('pointerdown', activity, { passive: true });
  document.addEventListener('pointermove', activity, { passive: true });
  document.addEventListener('keydown', activity);
  document.addEventListener('scroll', activity, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => document.hidden ? publish() : activity());
  window.addEventListener('blur', publish);
  window.addEventListener('focus', activity);
  on('users:update', () => { if (getCurrentUser() && published === null) activity(); });
  on('disconnect', () => { published = null; clearTimeout(timer); });
}
