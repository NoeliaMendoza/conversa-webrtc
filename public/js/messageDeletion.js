import { request, on } from './socket.js';
import { elements, markMessageDeleted } from './ui.js';

// Reto 4: confirmación antes de eliminar para todos los participantes.
export function setupMessageDeletion(getCurrentUser) {
  const dialog = document.getElementById('delete-dialog');
  const confirm = document.getElementById('delete-confirm');
  const cancel = document.getElementById('delete-cancel');
  const feedback = document.getElementById('delete-error');
  let selectedId = null;
  let pending = false;
  elements.messages.addEventListener('click', event => {
    const button = event.target.closest('button[data-delete]');
    if (!button || !getCurrentUser()) return;
    if (pending) return;
    selectedId = button.dataset.delete;
    document.getElementById('delete-preview').textContent = button.closest('article').querySelector('p').textContent;
    feedback.textContent = '';
    dialog.showModal();
    cancel.focus();
  });
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { selectedId = null; });
  document.getElementById('delete-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !selectedId || !getCurrentUser()) return;
    const id = selectedId;
    pending = true;
    confirm.disabled = true;
    feedback.textContent = '';
    try {
      await request('message:delete', { id });
      if (selectedId === id) dialog.close();
    } catch (error) { feedback.textContent = error.message; }
    finally { pending = false; confirm.disabled = false; }
  });
  on('message:delete', message => {
    markMessageDeleted(message);
    if (message.id === selectedId) dialog.close();
  });
  on('disconnect', () => dialog.close());
}
