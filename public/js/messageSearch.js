import { on, request } from './socket.js';
import { stopTyping } from './typing.js';

// Reto 12: búsqueda por WebSocket con espera corta y descarte de respuestas antiguas.
export function setupMessageSearch(container, getCurrentUser, feedback) {
  const byId = id => document.getElementById(id);
  const dialog = byId('search-dialog');
  const input = byId('search-query');
  const results = byId('search-results');
  const status = byId('search-status');
  const button = byId('search-open');
  let timer;
  let version = 0;
  async function search() {
    const current = ++version;
    const query = input.value.trim();
    results.replaceChildren();
    if (query.length < 2) { status.textContent = 'Escribe al menos 2 caracteres.'; return; }
    status.textContent = 'Buscando…';
    try {
      const response = await request('message:search', { query });
      if (current !== version || !dialog.open) return;
      status.textContent = response.total ? `${response.total} coincidencias${response.total > 50 ? ' · se muestran las 50 más recientes' : ''}` : 'No se encontraron mensajes.';
      results.replaceChildren(...response.messages.map(message => {
        const result = document.createElement('button');
        result.type = 'button';
        result.className = 'search-result';
        const author = document.createElement('strong');
        author.textContent = `${message.author} · ${new Date(message.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
        const text = document.createElement('span');
        text.textContent = message.content;
        result.append(author, text);
        result.addEventListener('click', () => {
          const original = [...container.children].find(item => item.dataset.id === message.id);
          if (!original || original.classList.contains('deleted')) { status.textContent = 'El mensaje ya no está disponible en la vista.'; return; }
          dialog.close();
          original.scrollIntoView({ block: 'center', behavior: 'smooth' });
          original.tabIndex = -1;
          original.focus({ preventScroll: true });
          original.classList.add('message-highlight');
          setTimeout(() => original.classList.remove('message-highlight'), 1800);
        });
        return result;
      }));
    } catch (error) { if (current === version) status.textContent = error.message; }
  }
  function schedule() {
    clearTimeout(timer);
    version++;
    results.replaceChildren();
    if (dialog.open) timer = setTimeout(search, 250);
  }
  input.addEventListener('input', schedule);
  button.addEventListener('click', () => {
    if (!getCurrentUser()) return;
    stopTyping();
    dialog.showModal();
    input.focus();
    if (input.value.trim().length >= 2) search();
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!button.disabled && !document.querySelector('dialog[open]')) button.click();
    }
  });
  byId('search-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { version++; clearTimeout(timer); });
  on('users:update', () => { button.disabled = !getCurrentUser(); });
  ['message:new', 'message:edit', 'message:delete'].forEach(event => on(event, () => { if (dialog.open) schedule(); }));
  on('disconnect', () => { dialog.close(); button.disabled = true; input.value = ''; results.replaceChildren(); });
}
