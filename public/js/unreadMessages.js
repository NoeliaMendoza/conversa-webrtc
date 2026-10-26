import { on } from './socket.js';
import { createUnreadState } from './unreadState.mjs';

// Reto 10: contador local alimentado por los eventos WebSocket del grupo.
export function setupUnreadMessages(container, getCurrentUser) {
  const state = createUnreadState();
  const button = document.getElementById('unread-button');
  const badge = document.getElementById('unread-badge');
  const originalTitle = document.title;
  const atEnd = () => container.scrollHeight - container.scrollTop - container.clientHeight <= 48;
  const reading = () => !document.hidden && document.hasFocus()
    && !document.querySelector('dialog[open], .conversation.private-mode, #workspace.sidebar-open, #workspace.details-open, #notifications-popover:not([hidden])') && atEnd();

  function render() {
    const count = state.count();
    button.hidden = !count;
    button.textContent = `${count} ${count === 1 ? 'mensaje nuevo' : 'mensajes nuevos'} ↓`;
    badge.hidden = !count;
    badge.textContent = count > 99 ? '99+' : count;
    badge.setAttribute('aria-label', `${count} mensajes sin leer en General`);
    document.title = count ? `(${count}) ${originalTitle}` : originalTitle;
  }
  function checkRead() {
    if (getCurrentUser() && reading()) { state.markRead(); render(); }
  }
  container.addEventListener('scroll', checkRead, { passive: true });
  window.addEventListener('focus', checkRead);
  document.addEventListener('visibilitychange', checkRead);
  window.addEventListener('resize', checkRead);
  document.addEventListener('workspace:panels-changed', checkRead);
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', checkRead));
  button.addEventListener('click', () => {
    container.scrollTop = container.scrollHeight;
    checkRead();
  });
  on('message:delete', message => { state.remove(message.id); render(); });
  on('disconnect', () => { state.reset(); render(); });
  return {
    receive(message) {
      const self = getCurrentUser();
      const scroll = reading();
      if (self) state.receive(message, self.id, scroll);
      render();
      return scroll;
    },
    reset(history) { state.reset(history); render(); }
  };
}
