import { request } from './socket.js';
import { elements } from './ui.js';

const dialog = document.getElementById('edit-dialog');
const form = document.getElementById('edit-form');
const content = document.getElementById('edit-content');
const feedback = document.getElementById('edit-error');
const save = document.getElementById('edit-save');
let messageId = null;
let saving = false;

export function closeMessageEditor() {
  dialog.close();
  messageId = null;
}

export function setupMessageEditing(getCurrentUser) {
  elements.messages.addEventListener('click', event => {
    const button = event.target.closest('button[data-edit]');
    if (!button || !getCurrentUser() || saving) return;
    messageId = button.dataset.edit;
    content.value = button.closest('article').querySelector('p').textContent;
    feedback.textContent = '';
    dialog.showModal();
    content.focus();
  });
  document.getElementById('edit-cancel').addEventListener('click', closeMessageEditor);
  dialog.addEventListener('close', () => { messageId = null; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !messageId || !getCurrentUser()) return;
    saving = true;
    save.disabled = true;
    feedback.textContent = '';
    try {
      await request('message:edit', { id: messageId, content: content.value });
      closeMessageEditor();
    } catch (error) { feedback.textContent = error.message; }
    finally { saving = false; save.disabled = false; }
  });
}
