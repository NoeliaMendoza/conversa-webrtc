import { on, emitTransient } from './socket.js';

export function setupPrivateTyping(input, getSelectedId, getCurrentUser) {
  const writers = new Map();
  const indicator = document.createElement('p');
  indicator.className = 'typing-indicator private-typing';
  indicator.id = 'private-typing'; indicator.setAttribute('role', 'status');
  input.closest('.composer').before(indicator);
  let activeId = null, timer, lastSent = 0;
  function render() {
    const name = writers.get(getSelectedId());
    indicator.textContent = name ? `${name} está escribiendo…` : '';
  }
  function stop() {
    clearTimeout(timer);
    if (activeId) emitTransient('private:typing:stop');
    activeId = null;
  }
  input.addEventListener('input', () => {
    const id = getSelectedId();
    if (!id || !getCurrentUser() || input.disabled || !input.value.trim()) return stop();
    if (activeId && activeId !== id) stop();
    if (!activeId || Date.now() - lastSent > 1000) {
      emitTransient('private:typing:start', { recipientId: id }); lastSent = Date.now();
    }
    activeId = id; clearTimeout(timer); timer = setTimeout(stop, 1500);
  });
  input.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  on('private:typing:start', user => { writers.set(user.id, user.name); render(); });
  on('private:typing:stop', user => { writers.delete(user.id); render(); });
  on('users:update', users => {
    const ids = new Set(users.map(user => user.id));
    for (const id of writers.keys()) if (!ids.has(id)) writers.delete(id);
    if (activeId && !ids.has(activeId)) stop();
    render();
  });
  on('disconnect', () => { stop(); writers.clear(); render(); });
  return { stop, render };
}
