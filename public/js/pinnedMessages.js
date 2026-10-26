import { on, request } from './socket.js';

let pinned = null;
const byId = id => document.getElementById(id);

export function renderPinned(state) {
  pinned = state;
  byId('pinned-banner').hidden = !state;
  if (state) {
    byId('pinned-author').textContent = `Fijado · ${state.message.author}`;
    byId('pinned-text').textContent = state.message.content;
    byId('pinned-banner').title = `Fijado por ${state.pinnedBy}`;
  } else {
    byId('pinned-author').textContent = '';
    byId('pinned-text').textContent = '';
  }
  document.querySelectorAll('button[data-pin]').forEach(button => {
    const selected = state?.message.id === button.dataset.pin;
    const label = button.querySelector('span');
    if (label) label.textContent = selected ? 'Fijado' : 'Fijar';
    button.setAttribute('aria-pressed', String(selected));
  });
  byId('detail-pin-count').textContent = state ? '1' : '0';
  byId('detail-pin-empty').hidden = !!state;
  byId('detail-pin-card').hidden = !state;
  byId('detail-pin-author').textContent = state?.message.author || '';
  byId('detail-pin-text').textContent = state?.message.content || '';
}

// Reto 13: destacado grupal sincronizado y navegación al mensaje original.
export function setupPinnedMessages(container, getCurrentUser, feedback) {
  let pending = false;
  async function change(id, remove) {
    if (pending || !getCurrentUser()) return;
    pending = true;
    feedback.textContent = '';
    try { await request(remove ? 'message:unpin' : 'message:pin', { id }); }
    catch (error) { feedback.textContent = error.message; }
    finally { pending = false; }
  }
  container.addEventListener('click', event => {
    const button = event.target.closest('button[data-pin]');
    if (button) change(button.dataset.pin, pinned?.message.id === button.dataset.pin);
  });
  byId('pinned-remove').addEventListener('click', () => {
    if (pinned) change(pinned.message.id, true);
  });
  byId('pinned-jump').addEventListener('click', () => {
    const message = [...container.children].find(item => item.dataset.id === pinned?.message.id);
    if (!message) { feedback.textContent = 'El mensaje fijado ya no está en el historial visible.'; return; }
    message.scrollIntoView({ block: 'center', behavior: 'smooth' });
    message.tabIndex = -1;
    message.focus({ preventScroll: true });
    message.classList.add('message-highlight');
    setTimeout(() => message.classList.remove('message-highlight'), 1800);
  });
  byId('detail-pin-card').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('workspace:close-panels'));
    byId('pinned-jump').click();
  });
  on('pin:update', renderPinned);
  on('disconnect', () => renderPinned(null));
}
