import { on, request } from './socket.js';
import './reactionEmojis.js';
import { icon } from './icons.js';

const emojis = globalThis.reactionEmojis;

function positionPicker(picker) {
  const options = picker.querySelector('.reaction-options');
  const scroller = picker.closest('.messages, .private-messages');
  if (!picker.open || !scroller) return;
  const bounds = scroller.getBoundingClientRect();
  const origin = picker.getBoundingClientRect();
  const anchor = picker.querySelector('summary').getBoundingClientRect();
  const width = options.offsetWidth, height = options.offsetHeight;
  const leftEdge = Math.max(8, bounds.left + 8);
  const rightEdge = Math.min(innerWidth - 8, bounds.right - 8);
  const topEdge = Math.max(8, bounds.top + 8);
  const bottomEdge = Math.min(innerHeight - 8, bounds.bottom - 8);
  const x = Math.max(leftEdge, Math.min(anchor.right - width, rightEdge - width));
  const preferredY = anchor.top - height - 6 >= topEdge ? anchor.top - height - 6 : anchor.bottom + 6;
  const y = Math.max(topEdge, Math.min(preferredY, bottomEdge - height));
  options.style.left = `${x - origin.left}px`;
  options.style.top = `${y - origin.top}px`;
  options.style.right = 'auto';
  options.style.bottom = 'auto';
}
function repositionOpenPickers() {
  document.querySelectorAll('.reaction-picker[open]').forEach(positionPicker);
}
window.addEventListener('resize', repositionOpenPickers);
document.addEventListener('scroll', repositionOpenPickers, { capture: true, passive: true });

// Reto 3: botones accesibles con contador y selección de la persona actual.
export function renderReactions(item, message, currentId) {
  let bar = item.querySelector('.reactions');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'reactions';
    bar.setAttribute('aria-label', 'Reacciones al mensaje');
    item.append(bar);
  }
  function reactionButton(emoji, showCount) {
    const authors = message.reactions?.[emoji] || [];
    const selected = authors.includes(currentId);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.reaction = emoji;
    button.textContent = `${emoji}${showCount ? ` ${authors.length}` : ''}`;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Quitar' : 'Agregar'} reacción ${emoji}. ${authors.length} reacciones`);
    return button;
  }
  const counts = emojis.filter(emoji => message.reactions?.[emoji]?.length)
    .map(emoji => reactionButton(emoji, true));
  const picker = document.createElement('details');
  picker.className = 'reaction-picker';
  const trigger = document.createElement('summary');
  trigger.append(icon('smile'));
  trigger.setAttribute('aria-label', 'Reaccionar al mensaje');
  trigger.title = 'Reaccionar';
  const options = document.createElement('div');
  options.className = 'reaction-options';
  options.setAttribute('role', 'group');
  options.setAttribute('aria-label', 'Elige una reacción');
  options.append(...emojis.map(emoji => reactionButton(emoji, false)));
  picker.append(trigger, options);
  picker.addEventListener('toggle', () => {
    if (picker.open) {
      document.querySelectorAll('.reaction-picker[open]').forEach(other => { if (other !== picker) other.open = false; });
      item.style.zIndex = '20';
      positionPicker(picker);
    } else item.style.zIndex = '';
  });
  bar.replaceChildren(...counts, picker);
}

export function setupReactions(container, getCurrentUser, feedback) {
  const pending = new Set();
  document.addEventListener('click', event => {
    if (!event.target.closest('.reaction-picker, [data-reaction-open]')) {
      container.querySelectorAll('.reaction-picker[open]').forEach(picker => { picker.open = false; });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') container.querySelectorAll('.reaction-picker[open]').forEach(picker => {
      picker.open = false;
      picker.querySelector('summary').focus();
    });
  });
  container.addEventListener('click', async event => {
    const button = event.target.closest('button[data-reaction]');
    if (!button || !getCurrentUser()) return;
    const id = button.closest('article').dataset.id;
    const key = id;
    if (pending.has(key)) return;
    pending.add(key);
    button.disabled = true;
    feedback.textContent = '';
    try { await request('reaction:toggle', { id, emoji: button.dataset.reaction }); }
    catch (error) { feedback.textContent = error.message; }
    finally { pending.delete(key); button.disabled = false; }
  });
  on('reaction:update', message => {
    const item = [...container.children].find(item => item.dataset.id === message.id);
    if (item) renderReactions(item, message, getCurrentUser()?.id);
  });
}
