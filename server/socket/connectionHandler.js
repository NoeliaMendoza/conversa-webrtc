const registerUserHandlers = require('./userHandler');
const registerMessageHandlers = require('./messageHandler');
const registerTypingHandlers = require('./typingHandler');
const registerReactionHandlers = require('./reactionHandler');
const registerPrivateMessageHandlers = require('./privateMessageHandler');
const registerPinHandlers = require('./pinHandler');
const registerPresenceHandlers = require('./presenceHandler');
const registerSearchHandlers = require('./searchHandler');
const registerPrivateTyping = require('./privateTypingHandler');

module.exports = function registerConnections(io) {
  io.on('connection', socket => {
    registerUserHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerReactionHandlers(io, socket);
    registerPrivateMessageHandlers(io, socket);
    registerPinHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerSearchHandlers(io, socket);
    registerPrivateTyping(io, socket);
  });
};
