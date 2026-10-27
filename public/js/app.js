import { on, connect, request, isConnected, onReconnecting } from './socket.js';
import { elements as el, setConnection, enableComposer, renderUsers, addMessage, addNotice, updateMessage } from './ui.js';
import { setupMessageEditing, closeMessageEditor } from './messageEditor.js';
import { setupTyping, stopTyping } from './typing.js';
import { setupReactions } from './reactions.js';
import { setupMessageDeletion } from './messageDeletion.js';
import { setupPrivateMessages } from './privateMessages.js';
import { setupReplies, getReplyId, clearReply } from './replies.js';
import { setupPinnedMessages, renderPinned } from './pinnedMessages.js';
import { setupUnreadMessages } from './unreadMessages.js';
import { setupPresence } from './presence.js';
import { setupMessageSearch } from './messageSearch.js';
import { setupWorkspace } from './workspace.js';
import { setupMessageActions } from './messageActions.js';
import { setupLocalPreview } from './localPreview.js';
import { setupCalls } from './calls.js';

let currentUser = null;
setupWorkspace(() => currentUser);
setupLocalPreview();
setupCalls(() => currentUser);
const unread = setupUnreadMessages(el.messages, () => currentUser);
let joining = false;
let sending = false;
let sessionToken = null;
let restoreTimer;
let connectionVersion = 0;
try { sessionToken = sessionStorage.getItem('conversa-session'); } catch { /* Se mantiene en memoria si el navegador bloquea el almacenamiento. */ }
function saveToken(token) {
  sessionToken = token;
  try {
    if (token) sessionStorage.setItem('conversa-session', token);
    else sessionStorage.removeItem('conversa-session');
  } catch { /* La reconexión sigue disponible mientras la pestaña permanezca abierta. */ }
}

async function joinChat(payload) {
  const version = connectionVersion;
  joining = true;
  el['join-button'].disabled = true;
  try {
    const result = await request('user:join', payload);
    if (version !== connectionVersion || !isConnected()) return;
    currentUser = result.user;
    saveToken(result.token);
    el.name.value = currentUser.name;
    el.messages.replaceChildren();
    el.welcome.hidden = result.messages.length > 0;
    result.messages.forEach(message => addMessage(message, currentUser.id));
    unread.reset(result.messages);
    renderPinned(result.pinned);
    el['join-dialog'].close();
    el.feedback.textContent = '';
    el['join-error'].textContent = '';
    setConnection(true);
    enableComposer(true);
    el.message.focus();
  } finally {
    if (version === connectionVersion) {
      joining = false;
      el['join-button'].disabled = !isConnected();
    }
  }
}

async function restoreSession() {
  if (!sessionToken || !isConnected() || joining) return;
  setConnection('reconnecting');
  try { await joinChat({ token: sessionToken }); }
  catch (error) {
    if (!isConnected()) return;
    if (error.code === 'SESSION_ACTIVE') {
      el.feedback.textContent = error.message;
      restoreTimer = setTimeout(restoreSession, 1500);
    } else {
      saveToken(null);
      setConnection(true);
      el['join-error'].textContent = error.message;
      if (!el['join-dialog'].open) el['join-dialog'].showModal();
    }
  }
}
el['join-dialog'].showModal();
el['join-dialog'].addEventListener('cancel', event => event.preventDefault());

on('connect', () => {
  connectionVersion++;
  joining = false;
  setConnection(true);
  el.feedback.textContent = '';
  el['join-error'].textContent = '';
  if (sessionToken) restoreSession();
});
onReconnecting(() => {
  setConnection('reconnecting');
  el.feedback.textContent = 'Intentando recuperar la conexión…';
});
on('connect_error', () => {
  setConnection('reconnecting');
  el['join-error'].textContent = 'No se puede conectar. Comprueba que el servidor esté ejecutándose.';
});
on('disconnect', () => {
  connectionVersion++;
  joining = false;
  clearTimeout(restoreTimer);
  closeMessageEditor();
  setConnection(false);
  enableComposer(false);
  currentUser = null;
  renderUsers([], null);
  el.feedback.textContent = 'Se perdió la conexión. Recuperaremos tu sesión automáticamente.';
  el['join-error'].textContent = 'Esperando que el servidor vuelva a estar disponible…';
  if (!sessionToken && !el['join-dialog'].open) el['join-dialog'].showModal();
});
on('presence:update', users => renderUsers(users, currentUser?.id));
on('user:join', user => addNotice(`${user.name} se ha conectado.`));
on('user:leave', user => addNotice(`${user.name} ha abandonado el chat.`));
on('message:new', message => {
  const scroll = unread.receive(message) || message.authorId === currentUser?.id;
  addMessage(message, currentUser?.id, { scroll });
});
on('message:edit', updateMessage);
setupMessageEditing(() => currentUser);
setupTyping(() => currentUser);
setupReactions(el.messages, () => currentUser, el.feedback);
setupMessageDeletion(() => currentUser);
setupPrivateMessages(() => currentUser);
setupReplies(el.messages, () => currentUser, el.feedback, el.message);
setupPinnedMessages(el.messages, () => currentUser, el.feedback);
setupPresence(() => currentUser);
setupMessageSearch(el.messages, () => currentUser, el.feedback);
setupMessageActions(el.messages);

el['join-form'].addEventListener('submit', async event => {
  event.preventDefault();
  if (joining || !isConnected()) return;
  el['join-error'].textContent = '';
  try {
    await joinChat({ name: el.name.value });
  } catch (error) { el['join-error'].textContent = error.message; }
});

el['message-form'].addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || !currentUser || !el.message.value.trim()) return;
  const content = el.message.value;
  const replyTo = getReplyId();
  stopTyping();
  sending = true;
  el.send.disabled = true;
  el.feedback.textContent = '';
  try {
    await request('message:new', { content, replyTo });
    clearReply(replyTo);
    if (el.message.value === content) el.message.value = '';
  } catch (error) { el.feedback.textContent = error.message; }
  finally { sending = false; el.send.disabled = el.message.disabled; }
});
el.message.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    el['message-form'].requestSubmit();
  }
});
connect();
