import { icon } from './icons.js';
import './reactionEmojis.js';

// Selector de escritura: inserta el emoji en la posición actual del cursor.
export function setupEmojiPicker(input, container) {
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'icon-button'; toggle.id = 'private-emoji';
  toggle.setAttribute('aria-label', 'Insertar emoji en mensaje privado');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'private-emoji-picker');
  toggle.append(icon('smile'));
  const picker = document.createElement('div');
  picker.id = 'private-emoji-picker'; picker.className = 'composer-emoji-picker'; picker.hidden = true;
  picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Emojis para el mensaje privado');
  function close() { picker.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  for (const emoji of globalThis.reactionEmojis) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = emoji;
    button.setAttribute('aria-label', `Insertar ${emoji}`);
    button.addEventListener('click', () => {
      if (input.disabled) return close();
      const length = input.value.length - (input.selectionEnd - input.selectionStart) + emoji.length;
      if (input.maxLength < 0 || length <= input.maxLength) {
        input.setRangeText(emoji, input.selectionStart, input.selectionEnd, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      close(); input.focus();
    });
    picker.append(button);
  }
  container.prepend(toggle); container.append(picker);
  toggle.addEventListener('click', () => {
    picker.hidden = !picker.hidden;
    toggle.setAttribute('aria-expanded', String(!picker.hidden));
    if (!picker.hidden) picker.querySelector('button').focus();
  });
  document.addEventListener('click', event => { if (!toggle.contains(event.target) && !picker.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !picker.hidden) { close(); toggle.focus(); } });
  return { close, setDisabled(disabled) { toggle.disabled = disabled; if (disabled) close(); } };
}
