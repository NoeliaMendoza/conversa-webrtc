import { on } from './socket.js';
import { avatarFor, hydrateIcons } from './icons.js';
import './reactionEmojis.js';

// Presentación del workspace. Los eventos Socket.IO conservan sus contratos.
export function setupWorkspace(getCurrentUser) {
  hydrateIcons();
  const byId = id => document.getElementById(id);
  const shell = byId('workspace');
  const backdrop = byId('panel-backdrop');
  const sidebarToggle = byId('sidebar-toggle');
  const detailsToggle = byId('details-toggle');
  const narrow = matchMedia('(max-width: 1020px)');
  const mobile = matchMedia('(max-width: 700px)');
  let sidebarOpen = false;
  let detailsOpen = false;
  let desktopDetails = false;
  let toastTimer;

  function syncPanels() {
    const detailsVisible = narrow.matches ? detailsOpen : desktopDetails;
    shell.classList.toggle('sidebar-open', sidebarOpen && mobile.matches);
    shell.classList.toggle('details-open', detailsOpen && narrow.matches);
    shell.classList.toggle('details-hidden', !desktopDetails);
    sidebarToggle.setAttribute('aria-expanded', String(sidebarOpen));
    sidebarToggle.setAttribute('aria-label', sidebarOpen ? 'Cerrar navegación' : 'Abrir navegación');
    detailsToggle.setAttribute('aria-expanded', String(detailsVisible));
    detailsToggle.setAttribute('aria-label', detailsVisible ? 'Ocultar detalles del grupo' : 'Mostrar detalles del grupo');
    byId('sidebar').inert = mobile.matches && !sidebarOpen;
    byId('details-panel').inert = !detailsVisible;
    backdrop.hidden = !(mobile.matches && sidebarOpen || narrow.matches && detailsOpen);
    document.dispatchEvent(new Event('workspace:panels-changed'));
  }
  function closePanels() { sidebarOpen = false; detailsOpen = false; desktopDetails = false; syncPanels(); }
  function showDetails() {
    sidebarOpen = false;
    if (narrow.matches) detailsOpen = true;
    else desktopDetails = true;
    syncPanels();
  }
  sidebarToggle.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    detailsOpen = false;
    syncPanels();
    if (sidebarOpen) byId('nav-home').focus();
  });
  detailsToggle.addEventListener('click', () => {
    sidebarOpen = false;
    if (narrow.matches) detailsOpen = !detailsOpen;
    else desktopDetails = !desktopDetails;
    syncPanels();
  });
  byId('details-close').addEventListener('click', () => {
    detailsOpen = false;
    if (!narrow.matches) desktopDetails = false;
    syncPanels();
    detailsToggle.focus();
  });
  backdrop.addEventListener('click', closePanels);
  narrow.addEventListener('change', closePanels);
  mobile.addEventListener('change', closePanels);
  document.addEventListener('workspace:close-panels', closePanels);
  byId('private-open').addEventListener('click', closePanels);
  byId('users').addEventListener('click', event => { if (event.target.closest('[data-private-user]')) closePanels(); });
  byId('nav-general').addEventListener('click', () => {
    closePanels();
    byId('messages').scrollTop = byId('messages').scrollHeight;
    if (!byId('message').disabled) byId('message').focus();
  });
  byId('nav-home').addEventListener('click', () => {
    showDetails();
    byId('details-panel').scrollTop = 0;
    byId('details-close').focus();
  });
  byId('nav-pinned').addEventListener('click', () => {
    showDetails();
    const section = byId('detail-pinned-section');
    section.scrollIntoView({ block: 'nearest' });
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.classList.add('section-highlight');
    setTimeout(() => section.classList.remove('section-highlight'), 1600);
  });
  function replaceAvatar(id, name) {
    const target = byId(id);
    const avatar = avatarFor(name);
    target.textContent = avatar.textContent;
    target.dataset.color = avatar.dataset.color;
    target.setAttribute('aria-label', name);
    target.title = name;
  }
  document.addEventListener('workspace:users', event => {
    const { users, currentId } = event.detail;
    const connected = users.filter(user => user.status !== 'offline');
    const online = connected.filter(user => user.status === 'online').length;
    byId('channel-count').textContent = `${connected.length} ${connected.length === 1 ? 'participante' : 'participantes'}`;
    byId('detail-count').textContent = connected.length;
    byId('detail-online').textContent = `${online} en línea · ${connected.length - online} ausentes`;
    for (const id of ['header-avatars', 'detail-avatars']) {
      byId(id).replaceChildren(...connected.slice(0, id === 'header-avatars' ? 3 : 6).map(user => avatarFor(user.name)));
      if (connected.length > 6 && id === 'detail-avatars') {
        const more = document.createElement('span');
        more.className = 'avatar'; more.textContent = `+${connected.length - 6}`;
        byId(id).append(more);
      }
    }
    const self = users.find(user => user.id === currentId);
    if (self) {
      replaceAvatar('current-avatar', self.name);
      replaceAvatar('sidebar-avatar', self.name);
      byId('profile-name').textContent = self.name;
      byId('profile-status').textContent = self.status === 'away' ? 'Ausente' : 'En línea';
    }
  });
  document.addEventListener('workspace:session', event => {
    if (!event.detail.enabled) byId('profile-status').textContent = 'Desconectado';
  });

  const notifications = [];
  const popover = byId('notifications-popover');
  function notification(text) {
    notifications.unshift({ text, at: new Date() });
    notifications.splice(30);
    byId('notifications-empty').hidden = notifications.length > 0;
    byId('notifications-list').replaceChildren(...notifications.map(entry => {
      const li = document.createElement('li'); li.textContent = entry.text;
      const time = document.createElement('time'); time.dateTime = entry.at.toISOString();
      time.textContent = entry.at.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      li.append(time); return li;
    }));
    byId('notification-dot').hidden = !popover.hidden;
  }
  function closeNotifications() { popover.hidden = true; byId('notifications-open').setAttribute('aria-expanded', 'false'); }
  byId('notifications-open').addEventListener('click', () => {
    popover.hidden = !popover.hidden;
    byId('notifications-open').setAttribute('aria-expanded', String(!popover.hidden));
    byId('notification-dot').hidden = true;
    if (!popover.hidden) byId('notifications-close').focus();
  });
  byId('notifications-close').addEventListener('click', () => { closeNotifications(); byId('notifications-open').focus(); });
  on('user:join', user => notification(`${user.name} se unió a General.`));
  on('user:leave', user => notification(`${user.name} salió del workspace.`));
  on('message:new', message => {
    const self = getCurrentUser();
    if (self && message.authorId !== self.id) notification(`${message.author} envió un mensaje en General.`);
  });
  on('private:message', message => {
    if (message.recipientId === getCurrentUser()?.id) notification(`Recibiste un mensaje privado de ${message.author}.`);
  });
  function toast(text) {
    clearTimeout(toastTimer);
    byId('toast').textContent = text;
    byId('toast').hidden = false;
    toastTimer = setTimeout(() => { byId('toast').hidden = true; }, 2400);
  }
  on('message:edit', message => { if (message.authorId === getCurrentUser()?.id) toast('Mensaje actualizado'); });
  on('message:delete', message => { if (message.authorId === getCurrentUser()?.id) toast('Mensaje eliminado para todos'); });
  on('pin:update', pin => toast(pin ? 'Mensaje fijado actualizado' : 'Mensaje desfijado'));

  const emojiPicker = byId('composer-emoji-picker');
  const emojiButton = byId('composer-emoji');
  function closeEmojis() { emojiPicker.hidden = true; emojiButton.setAttribute('aria-expanded', 'false'); }
  emojiPicker.replaceChildren(...globalThis.reactionEmojis.map(emoji => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = emoji;
    button.setAttribute('aria-label', `Insertar ${emoji}`);
    button.addEventListener('click', () => {
      const input = byId('message');
      if (input.disabled) return;
      input.setRangeText(emoji, input.selectionStart, input.selectionEnd, 'end');
      closeEmojis(); input.focus(); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return button;
  }));
  emojiButton.addEventListener('click', () => {
    emojiPicker.hidden = !emojiPicker.hidden;
    emojiButton.setAttribute('aria-expanded', String(!emojiPicker.hidden));
    if (!emojiPicker.hidden) emojiPicker.querySelector('button').focus();
  });
  byId('message').addEventListener('input', event => {
    const input = event.target; input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('#notifications-popover, #notifications-open')) closeNotifications();
    if (!event.target.closest('#composer-emoji-picker, #composer-emoji')) closeEmojis();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (sidebarOpen) { closePanels(); sidebarToggle.focus(); }
      else if (detailsOpen) { closePanels(); detailsToggle.focus(); }
      if (!emojiPicker.hidden) { closeEmojis(); emojiButton.focus(); }
      if (!popover.hidden) { closeNotifications(); byId('notifications-open').focus(); }
    }
    // Mantener el foco dentro del panel modal desplegado en pantallas pequeñas.
    if (event.key === 'Tab' && !document.querySelector('dialog[open]')) {
      const panel = mobile.matches && sidebarOpen ? byId('sidebar') : narrow.matches && detailsOpen ? byId('details-panel') : null;
      if (!panel) return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), a[href]')].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
  });
  on('disconnect', () => { closeEmojis(); closeNotifications(); closePanels(); byId('toast').hidden = true; });
  syncPanels();
}
