import { renderReactions } from './reactions.js';
import { renderQuote } from './replies.js';
import { avatarFor, icon } from './icons.js';
import { messageActions } from './messageActions.js';

export const elements = Object.fromEntries([
  'join-dialog', 'join-form', 'join-error', 'join-button', 'name',
  'message-form', 'message', 'send', 'feedback', 'messages', 'users',
  'user-count', 'connection', 'welcome'
].map(id => [id, document.getElementById(id)]));

export function setConnection(connected) {
  const online = connected === true;
  elements.connection.textContent = online ? 'Conectado' : connected === 'reconnecting' ? 'Reconectando…' : 'Desconectado';
  elements.connection.classList.toggle('online', online);
  elements.connection.classList.toggle('reconnecting', connected === 'reconnecting');
  document.querySelector('.composer-live .live-dot').classList.toggle('offline', !online);
  document.getElementById('composer-live-label').textContent = online ? 'Conversación en tiempo real' : elements.connection.textContent;
  elements['join-button'].disabled = !online;
}

export function enableComposer(enabled) {
  elements.message.disabled = !enabled;
  elements.send.disabled = !enabled;
  document.getElementById('composer-emoji').disabled = !enabled;
  document.dispatchEvent(new CustomEvent('workspace:session', { detail: { enabled } }));
}

export function renderUsers(users, currentId) {
  const connected = users.filter(user => user.status !== 'offline')
    .sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId));
  const offline = users.filter(user => user.status === 'offline').slice(-10).reverse();
  elements['user-count'].textContent = connected.length;
  function renderUser(user) {
    const item = document.createElement('li');
    const avatar = avatarFor(user.name);
    const name = document.createElement('span');
    name.textContent = user.name + (user.id === currentId ? ' (tú)' : '');
    name.className = 'user-name';
    const status = document.createElement('small');
    status.className = 'user-status';
    status.textContent = user.status === 'away' ? 'Ausente' : user.status === 'offline' ? 'Desconectado' : 'En línea';
    if (user.status === 'offline' && user.disconnectedAt) {
      const lastSeen = document.createElement('time');
      lastSeen.className = 'user-last-seen';
      lastSeen.dateTime = user.disconnectedAt;
      const date = new Date(user.disconnectedAt);
      lastSeen.textContent = `Última conexión: ${new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)}`;
      lastSeen.title = date.toLocaleString('es');
      status.append(lastSeen);
    }
    name.append(status);
    const dot = document.createElement('span');
    dot.className = `live-dot ${user.status || 'online'}`;
    item.append(avatar, name, dot);
    if (user.id !== currentId && user.status !== 'offline') {
      const actions = document.createElement('div'); actions.className = 'user-contact-actions'; item.append(actions);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'private-user-button';
      button.dataset.privateUser = user.id;
      button.append(icon('messages'));
      button.title = `Mensaje privado a ${user.name}`;
      button.setAttribute('aria-label', button.title);
      actions.append(button);
      const callButton = document.createElement('button');
      callButton.type = 'button'; callButton.className = 'private-user-button';
      callButton.dataset.callUser = user.id;
      callButton.title = `Llamar a ${user.name}`;
      callButton.setAttribute('aria-label', callButton.title);
      callButton.append(icon('camera'));
      actions.append(callButton);
      const audioButton = document.createElement('button');
      audioButton.type = 'button'; audioButton.className = 'private-user-button';
      audioButton.dataset.callUser = user.id; audioButton.dataset.callMode = 'audio';
      audioButton.title = 'Llamada de audio a ' + user.name; audioButton.setAttribute('aria-label', audioButton.title);
      audioButton.append(icon('phone')); actions.append(audioButton);
    }
    return item;
  }
  elements.users.replaceChildren(...connected.map(renderUser));
  document.getElementById('offline-users').replaceChildren(...offline.map(renderUser));
  document.getElementById('offline-section').hidden = !offline.length;
  document.dispatchEvent(new CustomEvent('workspace:users', { detail: { users, currentId } }));
}

export function addMessage(message, currentId, { scroll = true } = {}) {
  elements.welcome.hidden = true;
  const item = document.createElement('article');
  item.className = 'message' + (message.authorId === currentId ? ' own' : '');
  item.dataset.id = message.id;
  const date = new Date(message.createdAt);
  const day = date.toLocaleDateString('es');
  const last = elements.messages.querySelector('article:last-of-type');
  if (!last || last.dataset.day !== day) {
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    const label = document.createElement('span');
    label.textContent = day === new Date().toLocaleDateString('es') ? 'Hoy' : new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    separator.append(label);
    elements.messages.append(separator);
  }
  item.dataset.day = day;
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const name = document.createElement('strong');
  name.textContent = message.author;
  const time = document.createElement('time');
  time.dateTime = message.createdAt;
  time.textContent = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt));
  meta.append(name, time);
  const edited = document.createElement('span');
  edited.className = 'edited-label';
  edited.textContent = '(editado)';
  edited.hidden = !message.editedAt;
  meta.append(edited);
  const content = document.createElement('p');
  content.textContent = message.deletedAt ? 'Mensaje eliminado' : message.content;
  item.append(avatarFor(message.author, 'message-avatar'), meta, content);
  if (!message.deletedAt) item.append(messageActions(message, currentId));
  if (!message.deletedAt) renderQuote(item, message.reply);
  if (message.deletedAt) item.classList.add('deleted');
  else renderReactions(item, message, currentId);
  elements.messages.append(item);
  if (scroll) elements.messages.scrollTop = elements.messages.scrollHeight;
}

export function updateMessage(message) {
  const item = [...elements.messages.children].find(item => item.dataset.id === message.id);
  if (!item) return;
  item.querySelector('p').textContent = message.content;
  item.querySelector('.edited-label').hidden = false;
}

export function markMessageDeleted(message) {
  const item = [...elements.messages.children].find(item => item.dataset.id === message.id);
  if (!item) return;
  item.classList.add('deleted');
  item.querySelector('p').textContent = 'Mensaje eliminado';
  item.querySelector('.edited-label').hidden = true;
  item.querySelectorAll('button, .reactions, .message-actions').forEach(element => element.remove());
}

export function addNotice(text) {
  const atEnd = elements.messages.scrollHeight - elements.messages.scrollTop - elements.messages.clientHeight <= 48;
  const notice = document.createElement('p');
  notice.className = 'notice';
  notice.textContent = text;
  elements.messages.append(notice);
  if (atEnd && !document.hidden && !document.querySelector('dialog[open]')) elements.messages.scrollTop = elements.messages.scrollHeight;
}
