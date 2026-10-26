import { request, on } from './socket.js';
import { messageActions, setupMessageActions } from './messageActions.js';
import { renderReactions } from './reactions.js';
import { renderQuote } from './replies.js';

// Acciones y lectura de privados, separadas de la navegación entre contactos.
export function setupPrivateFeatures(list, { getCurrentUser, getMessages, getSelectedId }) {
  const byId = id => document.getElementById(id);
  const dialog = byId('private-action-dialog');
  const editor = byId('private-action-content');
  const feedback = byId('private-error');
  const pendingRead = new Set();
  const pendingReactions = new Set();
  let reply = null;
  let action = null;
  let saving = false;
  setupMessageActions(list);

  function clearReply() { reply = null; byId('private-reply-preview').hidden = true; }
  function showReply(message) {
    reply = { id: message.id, author: message.author, content: message.content };
    byId('private-reply-author').textContent = `Respondiendo a ${reply.author}`;
    byId('private-reply-text').textContent = reply.content.slice(0, 180);
    byId('private-reply-preview').hidden = false;
  }
  byId('private-reply-cancel').addEventListener('click', clearReply);
  byId('private-action-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { action = null; });
  byId('private-action-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!action || saving) return;
    const current = action;
    saving = true; byId('private-action-save').disabled = true;
    try {
      await request(`private:${current.type}`, { id: current.id, content: editor.value });
      if (action === current) dialog.close();
    } catch (error) { byId('private-action-error').textContent = error.message; }
    finally { saving = false; byId('private-action-save').disabled = false; }
  });
  list.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || !getCurrentUser()) return;
    const item = button.closest('article');
    const message = getMessages().find(message => message.id === item?.dataset.id);
    if (button.dataset.quoteId) {
      const original = [...list.children].find(item => item.dataset.id === button.dataset.quoteId);
      if (original) { original.scrollIntoView({ block: 'center', behavior: 'smooth' }); original.classList.add('message-highlight'); setTimeout(() => original.classList.remove('message-highlight'), 1600); }
      else feedback.textContent = 'El original ya no está en el historial visible.';
      return;
    }
    if (!message || message.deletedAt) return;
    if (button.dataset.reply) { showReply(message); byId('private-content').focus(); }
    if (button.dataset.edit || button.dataset.delete) {
      if (saving) return;
      const type = button.dataset.edit ? 'edit' : 'delete';
      action = { id: message.id, type };
      byId('private-action-title').textContent = type === 'edit' ? 'Editar mensaje privado' : '¿Eliminar mensaje privado?';
      editor.value = message.content; editor.hidden = type === 'delete'; editor.required = type === 'edit';
      byId('private-action-label').hidden = type === 'delete';
      byId('private-action-description').textContent = type === 'delete' ? 'Se eliminará para ambos participantes. Esta acción no se puede deshacer.' : '';
      byId('private-action-save').textContent = type === 'edit' ? 'Guardar cambios' : 'Eliminar mensaje';
      byId('private-action-error').textContent = '';
      dialog.showModal();
      (type === 'edit' ? editor : byId('private-action-cancel')).focus();
    }
    if (button.dataset.reaction && !pendingReactions.has(message.id)) {
      pendingReactions.add(message.id); button.disabled = true;
      try { await request('private:reaction', { id: message.id, emoji: button.dataset.reaction }); }
      catch (error) { feedback.textContent = error.message; }
      finally { pendingReactions.delete(message.id); button.disabled = false; }
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.reaction-picker, [data-reaction-open]')) list.querySelectorAll('.reaction-picker[open]').forEach(picker => { picker.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') list.querySelectorAll('.reaction-picker[open]').forEach(picker => { picker.open = false; picker.querySelector('summary').focus(); });
  });
  async function checkRead() {
    if (!getCurrentUser() || document.hidden || !document.hasFocus() || byId('private-dialog').hidden
      || !byId('private-dialog').classList.contains('has-contact') || document.querySelector('dialog[open]')) return;
    const bounds = list.getBoundingClientRect();
    for (const message of getMessages()) {
      if (message.authorId === getCurrentUser().id || message.readAt || message.deletedAt || pendingRead.has(message.id)) continue;
      const item = [...list.children].find(item => item.dataset.id === message.id);
      if (!item) continue;
      const rect = item.getBoundingClientRect();
      const visible = Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top);
      if (visible < Math.min(rect.height, bounds.height) * .6) continue;
      pendingRead.add(message.id);
      request('private:read', { id: message.id }).catch(() => {}).finally(() => pendingRead.delete(message.id));
    }
  }
  list.addEventListener('scroll', checkRead, { passive: true });
  window.addEventListener('focus', checkRead);
  document.addEventListener('visibilitychange', checkRead);
  on('disconnect', () => { dialog.close(); clearReply(); pendingRead.clear(); });
  return {
    render(item, message) {
      item.dataset.id = message.id;
      if (message.editedAt && !message.deletedAt) {
        const edited = document.createElement('span'); edited.className = 'edited-label'; edited.textContent = '(editado)';
        item.querySelector('.message-meta').append(edited);
      }
      if (message.deletedAt) { item.classList.add('deleted'); item.querySelector('p').textContent = 'Mensaje eliminado'; }
      else { item.append(messageActions(message, getCurrentUser()?.id, { privateMessage: true })); renderQuote(item, message.reply); renderReactions(item, message, getCurrentUser()?.id); }
      if (message.authorId === getCurrentUser()?.id && !message.deletedAt) {
        const receipt = document.createElement('small'); receipt.className = `message-receipt${message.readAt ? ' read' : ''}`;
        receipt.textContent = message.readAt ? 'Leído' : message.deliveredAt ? 'Recibido' : 'Enviado';
        item.querySelector('p').after(receipt);
      }
    },
    replyId: () => reply?.id,
    clearReply,
    sent(id) { if (reply?.id === id) clearReply(); },
    updated(message) {
      if (reply?.id === message.id) message.deletedAt ? clearReply() : showReply(message);
      if (message.deletedAt && action?.id === message.id) dialog.close();
    },
    checkRead() { requestAnimationFrame(checkRead); }
  };
}
