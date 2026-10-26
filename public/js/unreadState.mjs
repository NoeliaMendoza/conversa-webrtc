// Reto 10: solo mensajes nuevos de otras personas incrementan el contador.
export function createUnreadState() {
  const known = new Set();
  const pending = new Set();
  return {
    receive(message, currentId, reading) {
      const duplicate = known.has(message.id);
      known.add(message.id);
      if (known.size > 1000) known.delete(known.values().next().value);
      if (reading) pending.clear();
      else if (!duplicate && !message.deletedAt && message.authorId !== currentId) pending.add(message.id);
      return pending.size;
    },
    remove(id) { pending.delete(id); },
    markRead() { pending.clear(); },
    reset(history = []) {
      known.clear();
      history.forEach(message => known.add(message.id));
      pending.clear();
    },
    count: () => pending.size
  };
}
