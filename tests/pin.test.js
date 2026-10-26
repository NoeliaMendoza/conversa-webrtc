const { test } = require('node:test');
const assert = require('node:assert/strict');
const messages = require('../server/services/messageService');
const pins = require('../server/services/pinService');

test('el destacado se limpia cuando el original sale del historial limitado', () => {
  const user = { id: 'usuario-prueba', name: 'Noelia' };
  const original = messages.createMessage(user, 'Un mensaje antiguo');
  pins.pinMessage(user, original.id);
  assert.equal(pins.getPinned().message.id, original.id);
  for (let index = 0; index < 200; index++) messages.createMessage(user, `Mensaje ${index}`);
  assert.equal(messages.listMessages().length, 200);
  assert.equal(pins.getPinned(), null);
});
