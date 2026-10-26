import { icon } from './icons.js';

export function alignMessageControls(item) {
  requestAnimationFrame(() => {
    const bubble = item?.querySelector(':scope > p');
    if (item?.isConnected && bubble) item.style.setProperty('--bubble-top', `${bubble.offsetTop}px`);
  });
}
window.addEventListener('resize', () => {
  document.querySelectorAll('.message-actions').forEach(menu => alignMessageControls(menu.closest('article')));
});

export function messageActions(message, currentId, { privateMessage = false } = {}) {
  const menu = document.createElement('details');
  menu.className = 'message-actions';
  const trigger = document.createElement('summary');
  trigger.setAttribute('aria-label', 'Acciones del mensaje');
  trigger.append(icon('more'));
  const list = document.createElement('div');
  list.className = 'message-action-list';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Acciones del mensaje');
  const actions = [['reply', 'Responder', 'reply'], ...(!privateMessage ? [['pin', 'Fijar', 'pin']] : []), ['reactionOpen', 'Reaccionar', 'smile']];
  if (message.authorId === currentId) actions.push(['edit', 'Editar', 'edit'], ['delete', 'Eliminar', 'trash']);
  actions.forEach(([action, text, symbol]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset[action] = message.id;
    if (action === 'delete') button.className = 'delete-button';
    if (action === 'pin') button.setAttribute('aria-pressed', 'false');
    const label = document.createElement('span');
    label.textContent = text;
    button.append(icon(symbol), label);
    list.append(button);
  });
  menu.append(trigger, list);
  requestAnimationFrame(() => alignMessageControls(menu.closest('article')));
  menu.addEventListener('toggle', () => {
    if (menu.open) {
      document.querySelectorAll('.message-actions[open]').forEach(other => { if (other !== menu) other.open = false; });
      // El menú permanece dentro del área visible, incluso en mensajes cortos.
      const bounds = menu.closest('.messages, .private-messages').getBoundingClientRect();
      const anchor = trigger.getBoundingClientRect();
      list.style.position = 'fixed';
      list.style.left = `${Math.max(bounds.left + 8, Math.min(anchor.left, bounds.right - 186))}px`;
      list.style.right = 'auto';
      list.style.top = `${Math.max(bounds.top + 8, Math.min(anchor.bottom + 4, bounds.bottom - list.offsetHeight - 8))}px`;
    }
  });
  return menu;
}

export function setupMessageActions(container) {
  ['wheel', 'touchmove'].forEach(event => container.addEventListener(event, () => {
    container.querySelectorAll('.message-actions[open]').forEach(menu => { menu.open = false; });
  }, { passive: true }));
  document.addEventListener('click', event => {
    if (!event.target.closest('.message-actions')) container.querySelectorAll('.message-actions[open]').forEach(menu => { menu.open = false; });
  });
  container.addEventListener('click', event => {
    const button = event.target.closest('.message-action-list button');
    if (!button) return;
    if (button.dataset.reactionOpen) {
      const picker = button.closest('article').querySelector('.reaction-picker');
      if (picker) { picker.open = true; picker.querySelector('button')?.focus(); }
    }
    button.closest('.message-actions').open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') container.querySelectorAll('.message-actions[open]').forEach(menu => { menu.open = false; menu.querySelector('summary').focus(); });
  });
}
