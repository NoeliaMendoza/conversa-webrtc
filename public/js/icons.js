// Iconos vectoriales locales. No se inserta HTML ni contenido procedente del usuario.
const paths = {
  'window-minimize': ['M5 17h14'],
  'window-expand': ['M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5'],
  'window-restore': ['M8 8h13v13H8Z','M16 8V3H3v13h5'],
  eye: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z','M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  mic: ['M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Z','M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8'],
  'mic-off': ['m3 3 18 18','M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v5','M5 10v2a7 7 0 0 0 11 6M19 10v2M12 19v3M8 22h8'],
  'camera-off': ['m3 3 18 18','M3 6v12h12v-3M8 6h7v5','m15 10 6-4v12l-3-2'],
  phone: ['M6 3h4l1 5-3 2a14 14 0 0 0 6 6l2-3 5 1v4a3 3 0 0 1-3 3A18 18 0 0 1 3 6a3 3 0 0 1 3-3Z'],
  'phone-end': ['M3 15v-4a16 16 0 0 1 18 0v4l-5 1-1-4a12 12 0 0 0-6 0l-1 4Z'],
  play: ['m9 5 11 7-11 7Z'],
  camera: ['M3 6h12v12H3Z', 'm15 10 6-4v12l-6-4Z'],
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
