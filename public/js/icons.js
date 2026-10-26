// Iconos vectoriales locales. No se inserta HTML ni contenido procedente del usuario.
const paths = {
  logo: ['M5 4h10a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H9l-5 3V9a5 5 0 0 1 1-5Z', 'M9 9h7M9 13h5'],
  menu: ['M4 6h16M4 12h16M4 18h16'], x: ['m6 6 12 12M6 18 18 6'],
  search: ['M21 21l-4.5-4.5', 'M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  home: ['m3 10 9-7 9 7v10H3Z', 'M9 20v-7h6v7'], hash: ['M5 9h15M4 15h15M11 3 7 21M17 3l-4 18'],
  messages: ['M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z', 'M7 9h10M7 13h6'],
  pin: ['m16 3 5 5-4 1-4 4 1 4-2 2-7-7 2-2 4 1 4-4Z', 'm3 21 5-5'],
  shield: ['M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z', 'm8 12 3 3 5-6'],
  'chevron-down': ['m6 9 6 6 6-6'], panel: ['M3 4h18v16H3Z', 'M15 4v16'],
  sparkles: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
  'arrow-right': ['M4 12h16m-6-6 6 6-6 6'], send: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'],
  smile: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M8 9h.01M16 9h.01M7 14s2 3 5 3 5-3 5-3'],
  reply: ['m9 10-5-5 5-4', 'M4 5h9a7 7 0 0 1 7 7v7'], more: ['M5 12h.01M12 12h.01M19 12h.01'],
  edit: ['m16 3 5 5-12 12-6 1 1-6Z', 'm14 5 5 5'], trash: ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7']
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths[name] || paths.messages) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => element.replaceChildren(icon(element.dataset.icon)));
}
export function avatarFor(name, className = '') {
  const avatar = document.createElement('span');
  avatar.className = `avatar ${className}`;
  avatar.textContent = name.trim().split(/\s+/).slice(0, 2).map(part => [...part][0]).join('').toUpperCase();
  avatar.dataset.color = String([...name].reduce((sum, char) => sum + char.codePointAt(0), 0) % 6);
  avatar.title = name;
  return avatar;
}
