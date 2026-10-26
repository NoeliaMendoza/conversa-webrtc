const { test } = require('node:test');
const assert = require('node:assert/strict');

test('no leídos: eventos nuevos, duplicados, propios, borrados y lectura', async () => {
  const { createUnreadState } = await import('../public/js/unreadState.mjs');
  const state = createUnreadState();
  const message = { id: '1', authorId: 'otro' };
  assert.equal(state.receive(message, 'yo', false), 1);
  assert.equal(state.receive(message, 'yo', false), 1);
  assert.equal(state.receive({ id: '2', authorId: 'yo' }, 'yo', false), 1);
  assert.equal(state.receive({ id: '3', authorId: 'otro', deletedAt: 'fecha' }, 'yo', false), 1);
  assert.equal(state.receive({ id: '4', authorId: 'otro' }, 'yo', false), 2);
  state.remove('1');
  assert.equal(state.count(), 1);
  state.markRead();
  assert.equal(state.count(), 0);
  assert.equal(state.receive({ id: '5', authorId: 'otro' }, 'yo', true), 0);
  state.receive({ id: '6', authorId: 'otro' }, 'yo', false);
  state.reset([message]);
  assert.equal(state.count(), 0);
  assert.equal(state.receive(message, 'yo', false), 0);
  assert.equal(state.receive({ id: '7', authorId: 'otro' }, 'yo', false), 1);
  state.reset();
  assert.equal(state.count(), 0);
});
