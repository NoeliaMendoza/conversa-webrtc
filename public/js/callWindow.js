import { icon } from './icons.js';
// Gestiona únicamente posición y tamaño; no desmonta videos ni altera los medios.
export function setupCallWindow() {
  const el = id => document.getElementById(id);
  const panel = el('call-panel'), heading = el('call-window-heading');
  const mobile = matchMedia('(max-width: 700px)');
  let mode = 'normal', previous = 'normal', position = null, drag = null;
  function clamp(value, min, max) { return Math.min(Math.max(value, min), Math.max(min, max)); }
  function place(x, y) {
    const rect = panel.getBoundingClientRect();
    const left = clamp(x, 10, innerWidth - rect.width - 10);
    const top = clamp(y, 86, innerHeight - rect.height - 10);
    panel.style.left = left + 'px'; panel.style.top = top + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto';
    return { x: left, y: top };
  }
  function fit() {
    panel.style.left = panel.style.top = panel.style.right = panel.style.bottom = '';
    if (!mobile.matches && mode === 'normal' && position && !panel.hidden) position = place(position.x, position.y);
  }
  function setMode(value) {
    if (drag) endDrag();
    mode = value; panel.dataset.window = mode;
    const minimized = mode === 'minimized', expanded = mode === 'expanded';
    el('call-minimize').setAttribute('aria-label', minimized ? 'Restaurar llamada' : 'Minimizar llamada');
    el('call-minimize').title = minimized ? 'Restaurar llamada' : 'Minimizar llamada';
    el('call-minimize').replaceChildren(icon(minimized ? 'window-restore' : 'window-minimize'));
    el('call-expand').setAttribute('aria-label', expanded ? 'Reducir ventana' : 'Ampliar llamada');
    el('call-expand').title = expanded ? 'Reducir ventana' : 'Ampliar llamada';
    el('call-expand').replaceChildren(icon(expanded ? 'window-restore' : 'window-expand'));
    const concealed = [el('call-videos'), el('call-status'), el('call-error')];
    if (minimized && concealed.some(node => node.contains(document.activeElement))) el('call-minimize').focus();
    concealed.forEach(node => { node.inert = minimized; });
    fit();
  }
  function endDrag() {
    if (!drag) return;
    const pointerId = drag.id; drag = null; panel.classList.remove('is-dragging');
    if (heading.hasPointerCapture(pointerId)) heading.releasePointerCapture(pointerId);
  }
  heading.addEventListener('pointerdown', event => {
    if (mobile.matches || mode !== 'normal' || event.button !== 0 || event.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    heading.setPointerCapture(event.pointerId); panel.classList.add('is-dragging'); event.preventDefault();
  });
  heading.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    position = place(event.clientX - drag.dx, event.clientY - drag.dy);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) heading.addEventListener(event, endDrag);
  heading.addEventListener('keydown', event => {
    if (event.target !== heading || mobile.matches || mode !== 'normal' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    const rect = panel.getBoundingClientRect(), step = event.shiftKey ? 40 : 12;
    position = place(rect.left + ({ArrowLeft:-step,ArrowRight:step}[event.key] || 0), rect.top + ({ArrowUp:-step,ArrowDown:step}[event.key] || 0)); event.preventDefault();
  });
  el('call-minimize').addEventListener('click', () => {
    if (mode === 'minimized') setMode(previous); else { previous = mode; setMode('minimized'); }
  });
  el('call-expand').addEventListener('click', () => setMode(mode === 'expanded' ? 'normal' : 'expanded'));
  el('call-self-toggle').addEventListener('click', () => {
    const hidden = panel.classList.toggle('self-preview-hidden');
    el('call-self-toggle').setAttribute('aria-pressed', String(hidden));
    el('call-self-toggle').setAttribute('aria-label', hidden ? 'Mostrar mi vista previa' : 'Ocultar mi vista previa');
    el('call-self-toggle').title = hidden ? 'Mostrar mi vista previa' : 'Ocultar mi vista previa';
    el('call-self-toggle').lastElementChild.textContent = hidden ? 'Mostrar mi vista' : 'Ocultar mi vista';
  });
  function reset() {
    position = null; previous = 'normal'; panel.classList.remove('self-preview-hidden');
    el('call-self-toggle').setAttribute('aria-pressed', 'false');
    el('call-self-toggle').setAttribute('aria-label', 'Ocultar mi vista previa');
    el('call-self-toggle').title = 'Ocultar mi vista previa';
    el('call-self-toggle').lastElementChild.textContent = 'Ocultar mi vista';
    setMode('normal');
  }
  window.addEventListener('resize', () => { endDrag(); fit(); });
  mobile.addEventListener('change', () => { endDrag(); fit(); });
  setMode('normal');
  return { reset, restore: () => setMode('normal'), refresh: fit };
}
