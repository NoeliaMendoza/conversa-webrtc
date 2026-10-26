const socket = io({
  transports: ['websocket'], autoConnect: false,
  reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000
});

export function on(event, handler) { socket.on(event, handler); }
export function connect() { socket.connect(); }
export function isConnected() { return socket.connected; }
export function onReconnecting(handler) { socket.io.on('reconnect_attempt', handler); }
// Los eventos efímeros no se acumulan durante una desconexión.
export function emitTransient(event, payload) {
  if (socket.connected) socket.volatile.emit(event, payload);
}
export function request(event, payload) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) return reject(new Error('No hay conexión con el servidor.'));
    socket.timeout(5000).emit(event, payload, (error, response) => {
      if (error) return reject(new Error('El servidor no respondió. Comprueba el chat antes de reintentar.'));
      if (!response?.ok) return reject(Object.assign(new Error(response?.error || 'No se pudo completar la operación.'), { code: response?.code }));
      resolve(response);
    });
  });
}
