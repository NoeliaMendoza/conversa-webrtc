import { on } from './socket.js';
import { alignMessageControls } from './messageActions.js';

let selected = null;
const byId = id => document.getElementById(id);

// Reto 11: cita navegable y selección del mensaje que se va a responder.
export function renderQuote(item, reply) {
  if (!reply) return;
  let quote = item.querySelector('.message-quote');
  if (!quote) {
    quote = document.createElement('button');
    quote.type = 'button';
    quote.className = 'message-quote';
    item.querySelector('.message-meta').after(quote);
  }
  quote.dataset.quoteId = reply.id;
  quote.setAttribute('aria-label', `Ir al mensaje de ${reply.author}`);
  const author = document.createElement('strong');
  author.textContent = reply.author;
  const text = document.createElement('span');
  text.textContent = reply.content;
  quote.replaceChildren(author, text);
  alignMessageControls(item);
}

export function getReplyId() { return selected?.id; }
export function clearReply(expectedId = selected?.id) {
  if (selected?.id !== expectedId) return;
  selected = null;
  byId('reply-preview').hidden = true;
}

function showPreview() {
  byId('reply-author').textContent = `Respondiendo a ${selected.author}`;
  byId('reply-text').textContent = selected.content;
  byId('reply-preview').hidden = false;
}

export function setupReplies(container, getCurrentUser, feedback, input) {
  byId('reply-cancel').addEventListener('click', () => { clearReply(); input.focus(); });
  container.addEventListener('click', event => {
    const respond = event.target.closest('button[data-reply]');
    if (respond && getCurrentUser()) {
      const message = respond.closest('article');
      selected = {
        id: respond.dataset.reply,
        author: message.querySelector('.message-meta strong').textContent,
        content: message.querySelector('p').textContent.slice(0, 180)
      };
      showPreview();
      input.focus();
    }
    const quote = event.target.closest('button[data-quote-id]');
    if (quote) {
      const original = [...container.children].find(item => item.dataset.id === quote.dataset.quoteId);
      if (!original) { feedback.textContent = 'El mensaje original ya no está en el historial visible.'; return; }
      original.scrollIntoView({ block: 'center', behavior: 'smooth' });
      original.tabIndex = -1;
      original.focus({ preventScroll: true });
      original.classList.add('message-highlight');
      setTimeout(() => original.classList.remove('message-highlight'), 1800);
    }
  });
  function refreshQuotes(message) {
    container.querySelectorAll('.message-quote').forEach(quote => {
      if (quote.dataset.quoteId === message.id) renderQuote(quote.closest('article'), {
        id: message.id, author: message.author,
        content: message.deletedAt ? 'Mensaje eliminado' : message.content.slice(0, 180)
      });
    });
    if (selected?.id === message.id) {
      if (message.deletedAt) { clearReply(); feedback.textContent = 'El mensaje que ibas a responder fue eliminado.'; }
      else { selected.content = message.content.slice(0, 180); showPreview(); }
    }
  }
  on('message:edit', refreshQuotes);
  on('message:delete', refreshQuotes);
  on('disconnect', () => clearReply());
}
