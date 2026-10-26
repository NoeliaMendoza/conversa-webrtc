import { on, emitTransient } from './socket.js';
import { elements } from './ui.js';

// Reto 1: indicador compartido de escritura.
const writers = new Map();
const indicator = document.getElementById('typing');
let idleTimer;
let active = false;
let lastSent = 0;

function render() {
  const names = [...writers.values()];
  indicator.textContent = names.length === 0 ? ''
    : names.length === 1 ? `${names[0]} está escribiendo…`
    : names.length === 2 ? `${names.join(' y ')} están escribiendo…`
    : `${names.length} personas están escribiendo…`;
}

export function stopTyping() {
  clearTimeout(idleTimer);
  if (active) emitTransient('typing:stop');
  active = false;
}

export function setupTyping(getCurrentUser) {
  elements.message.addEventListener('input', () => {
    if (!getCurrentUser() || !elements.message.value.trim()) return stopTyping();
    const now = Date.now();
    if (!active || now - lastSent > 1000) {
      emitTransient('typing:start');
      lastSent = now;
    }
    active = true;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(stopTyping, 1500);
  });
  elements.message.addEventListener('blur', stopTyping);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTyping();
  });
  on('typing:start', user => { writers.set(user.id, user.name); render(); });
  on('typing:stop', user => { writers.delete(user.id); render(); });
  on('users:update', users => {
    const ids = new Set(users.map(user => user.id));
    for (const id of writers.keys()) if (!ids.has(id)) writers.delete(id);
    render();
  });
  on('disconnect', () => { stopTyping(); writers.clear(); render(); });
}
