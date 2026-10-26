import { on, request } from './socket.js';
import { elements } from './ui.js';
import { stopTyping } from './typing.js';
import { avatarFor } from './icons.js';
import { setupPrivateFeatures } from './privateMessageFeatures.js';
import { setupEmojiPicker } from './emojiPicker.js';
import { setupPrivateTyping } from './privateTyping.js';

// Reto 6: vista de conversaciones privadas; mismo evento y contrato del servidor.
export function setupPrivateMessages(getCurrentUser) {
  const byId = id => document.getElementById(id);
  const view = byId('private-dialog');
  const group = document.querySelector('.conversation');
  group.append(view);
  const openButton = byId('private-open');
  const list = byId('private-messages');
  const input = byId('private-content');
  const send = byId('private-send');
  const feedback = byId('private-error');
  const emojis = setupEmojiPicker(input, input.closest('.composer'));
  const conversations = new Map();
  let users = [];
  let selectedId = null;
  let sending = false;
  let alertContact = null;
  const typing = setupPrivateTyping(input, () => selectedId, getCurrentUser);
  const features = setupPrivateFeatures(list, { getCurrentUser, getMessages: () => conversations.get(selectedId)?.messages || [], getSelectedId: () => selectedId });
  function hideAlert() { byId('private-alert').hidden = true; alertContact = null; }

  function threadFor(id, name) {
    if (!conversations.has(id)) conversations.set(id, { name, messages: [], unread: 0, draft: '' });
    return conversations.get(id);
  }
  function contacts() {
    const entries = new Map(users.filter(user => user.id !== getCurrentUser()?.id).map(user => [user.id, user.name]));
    for (const [id, thread] of conversations) entries.set(id, thread.name);
    return entries;
  }
  function renderContacts() {
    const entries = contacts();
    byId('private-contacts-empty').hidden = entries.size > 0;
    byId('private-contact-list').replaceChildren(...[...entries].map(([id, name]) => {
      const thread = conversations.get(id);
      const user = users.find(user => user.id === id);
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'private-contact'; button.dataset.contact = id;
      button.setAttribute('aria-current', String(id === selectedId));
      const info = document.createElement('span'); info.className = 'private-contact-info';
      const title = document.createElement('strong'); title.textContent = name;
      const preview = document.createElement('small');
      preview.textContent = thread?.messages.at(-1)?.deletedAt ? 'Mensaje eliminado' : thread?.messages.at(-1)?.content || (user ? 'Iniciar conversación' : 'Desconectado');
      info.append(title, preview);
      const dot = document.createElement('span'); dot.className = `live-dot ${user?.status || 'offline'}`;
      button.append(avatarFor(name), info, dot);
      if (thread?.unread) { const badge = document.createElement('span'); badge.className = 'private-unread'; badge.textContent = thread.unread; button.append(badge); }
      button.addEventListener('click', () => select(id));
      item.append(button); return item;
    }));
    const unread = [...conversations.values()].reduce((sum, thread) => sum + thread.unread, 0);
    byId('private-label').textContent = unread ? `Mensajes privados · ${unread}` : 'Mensajes privados';
  }
  function renderHeader() {
    typing.render();
    const thread = conversations.get(selectedId);
    const user = users.find(user => user.id === selectedId);
    input.disabled = !user;
    emojis.setDisabled(!user);
    send.disabled = !user || sending;
    byId('private-peer-name').textContent = thread?.name || 'Elige una conversación';
    byId('private-status').textContent = !thread ? 'Selecciona a una persona de la lista para escribirle.'
      : !user ? 'Desconectado · No se pueden enviar mensajes.' : user.status === 'away' ? 'Ausente' : 'En línea';
    const avatar = byId('private-peer-avatar'); avatar.hidden = !thread;
    if (thread) { const value = avatarFor(thread.name); avatar.textContent = value.textContent; avatar.dataset.color = value.dataset.color; }
    input.placeholder = thread ? `Mensaje a ${thread.name}…` : 'Selecciona una conversación';
  }
  function renderThread(scroll = true) {
    const position = list.scrollTop;
    const thread = conversations.get(selectedId);
    list.replaceChildren(...(thread?.messages || []).map((message, index) => {
      const item = document.createElement('article');
      item.className = 'message' + (message.authorId === getCurrentUser()?.id ? ' own' : '');
      const previous = thread.messages[index - 1];
      const compact = previous && previous.authorId === message.authorId
        && new Date(message.createdAt) - new Date(previous.createdAt) < 300000;
      if (compact) item.classList.add('compact-message');
      const meta = document.createElement('div'); meta.className = 'message-meta';
      const name = document.createElement('strong'); name.textContent = message.authorId === getCurrentUser()?.id ? 'Tú' : message.author;
      const time = document.createElement('time'); time.dateTime = message.createdAt;
      time.textContent = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt));
      meta.append(name, time);
      const body = document.createElement('p'); body.textContent = message.content;
      item.append(meta, body); features.render(item, message);
      if (compact) {
        const compactTime = time.cloneNode(true);
        compactTime.className = 'compact-message-time';
        const receipt = item.querySelector('.message-receipt');
        if (receipt) receipt.prepend(compactTime, document.createTextNode(' · '));
        else body.after(compactTime);
      }
      return item;
    }));
    if (!thread?.messages.length) {
      const empty = document.createElement('p'); empty.className = 'private-empty';
      empty.textContent = thread ? `Aún no hay mensajes con ${thread.name}.` : 'Tus conversaciones privadas aparecerán aquí.';
      list.append(empty);
    }
    renderHeader();
    list.scrollTop = scroll ? list.scrollHeight : position;
    features.checkRead();
  }
  function saveDraft() { if (selectedId && conversations.has(selectedId)) conversations.get(selectedId).draft = input.value; }
  function select(id) {
    typing.stop();
    emojis.close();
    saveDraft();
    const name = contacts().get(id);
    if (!name) return;
    selectedId = id;
    features.clearReply();
    if (alertContact === id) hideAlert();
    const thread = threadFor(id, name); thread.unread = 0;
    input.value = thread.draft;
    feedback.textContent = '';
    view.classList.add('has-contact');
    renderContacts(); renderThread();
    if (!input.disabled && !matchMedia('(max-width:700px)').matches) input.focus();
  }
  function open(id) {
    if (!getCurrentUser()) return;
    stopTyping();
    view.hidden = false;
    group.classList.add('private-mode'); byId('workspace').classList.add('private-chat');
    [...group.children].forEach(child => { if (child !== view) child.inert = true; });
    openButton.classList.add('active'); openButton.setAttribute('aria-current', 'page');
    byId('nav-general').classList.remove('active'); byId('nav-general').removeAttribute('aria-current');
    document.dispatchEvent(new CustomEvent('workspace:close-panels'));
    renderContacts();
    const preferred = id || [...conversations].find(([, thread]) => thread.unread)?.[0] || selectedId;
    if (preferred && contacts().has(preferred)) select(preferred);
    else renderThread();
    document.dispatchEvent(new Event('workspace:panels-changed'));
  }
  function close() {
    typing.stop();
    emojis.close();
    saveDraft(); view.hidden = true; group.classList.remove('private-mode'); byId('workspace').classList.remove('private-chat');
    [...group.children].forEach(child => { if (child !== view) child.inert = false; });
    openButton.classList.remove('active'); openButton.removeAttribute('aria-current');
    byId('nav-general').classList.add('active'); byId('nav-general').setAttribute('aria-current', 'page');
    document.dispatchEvent(new Event('workspace:panels-changed'));
  }
  openButton.addEventListener('click', () => open());
  byId('private-close').addEventListener('click', () => { close(); if (!elements.message.disabled) elements.message.focus(); });
  byId('private-back').addEventListener('click', () => { typing.stop(); saveDraft(); view.classList.remove('has-contact'); byId('private-contact-list').querySelector('button')?.focus(); });
  ['nav-general', 'nav-home', 'nav-pinned', 'search-open'].forEach(id => byId(id).addEventListener('click', close, { capture: true }));
  elements.users.addEventListener('click', event => { const button = event.target.closest('button[data-private-user]'); if (button) open(button.dataset.privateUser); });
  on('users:update', connected => { users = connected; openButton.disabled = !getCurrentUser(); renderContacts(); renderHeader(); });
  on('presence:update', roster => { users = roster.filter(user => user.status !== 'offline'); renderContacts(); renderHeader(); });
  on('private:message', message => {
    const self = getCurrentUser();
    if (!self || (message.authorId !== self.id && message.recipientId !== self.id)) return;
    const incoming = message.authorId !== self.id;
    const id = incoming ? message.authorId : message.recipientId;
    const thread = threadFor(id, incoming ? message.author : message.recipient);
    if (thread.messages.some(item => item.id === message.id)) return;
    thread.messages.push(message); if (thread.messages.length > 200) thread.messages.shift();
    if (incoming) request('private:received', { id: message.id }).catch(() => {});
    const reading = !view.hidden && view.classList.contains('has-contact') && selectedId === id && !document.hidden && document.hasFocus();
    if (incoming && !reading) {
      thread.unread++;
      alertContact = id;
      byId('private-alert-title').textContent = message.author;
      byId('private-alert').hidden = false;
    }
    if (selectedId === id) renderThread(!incoming || list.scrollHeight - list.scrollTop - list.clientHeight < 60);
    renderContacts();
  });
  for (const event of ['private:edit', 'private:delete', 'private:reaction', 'private:received', 'private:read']) on(event, message => {
    const self = getCurrentUser();
    if (!self || ![message.authorId, message.recipientId].includes(self.id)) return;
    const id = message.authorId === self.id ? message.recipientId : message.authorId;
    const thread = conversations.get(id);
    const index = thread?.messages.findIndex(item => item.id === message.id);
    if (index == null || index < 0) return;
    thread.messages[index] = message;
    for (const item of thread.messages) if (item.reply?.id === message.id) {
      item.reply.content = message.deletedAt ? 'Mensaje eliminado' : message.content.slice(0, 180);
    }
    features.updated(message);
    if (selectedId === id) renderThread(false);
    renderContacts();
  });
  on('disconnect', () => { hideAlert(); close(); conversations.clear(); users = []; selectedId = null; input.value = ''; openButton.disabled = true; view.classList.remove('has-contact'); renderContacts(); renderThread(); });
  byId('private-alert-open').addEventListener('click', () => { if (alertContact) open(alertContact); });
  byId('private-alert-close').addEventListener('click', hideAlert);
  byId('private-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !getCurrentUser() || input.disabled || !input.value.trim()) return;
    const text = input.value, recipientId = selectedId;
    typing.stop();
    const replyTo = features.replyId();
    sending = true; send.disabled = true; feedback.textContent = '';
    try {
      await request('private:message', { recipientId, content: text, replyTo });
      features.sent(replyTo);
      if (selectedId === recipientId && input.value === text) input.value = '';
      if (conversations.has(recipientId)) conversations.get(recipientId).draft = '';
    } catch (error) { feedback.textContent = error.message; }
    finally { sending = false; renderHeader(); }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); byId('private-form').requestSubmit(); }
  });
  function markActiveRead() {
    if (!view.hidden && view.classList.contains('has-contact') && !document.hidden && document.hasFocus()) {
      const thread = conversations.get(selectedId);
      if (thread?.unread) { thread.unread = 0; renderContacts(); }
    }
  }
  window.addEventListener('focus', markActiveRead);
  document.addEventListener('visibilitychange', markActiveRead);
}
