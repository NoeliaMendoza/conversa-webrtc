// Lista compartida por la interfaz y la validación del servidor.
const reactionEmojis = ['👍', '❤️', '😂', '😍', '😮', '😢', '😡', '🔥', '🎉', '👏', '🙏', '💯'];

if (typeof module !== 'undefined') module.exports = reactionEmojis;
else globalThis.reactionEmojis = Object.freeze(reactionEmojis);
