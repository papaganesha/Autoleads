const EventEmitter = require('events');

const emitter = new EventEmitter();

// Max listeners per search to prevent memory leaks
emitter.setMaxListeners(10);

/**
 * Emit a search state update to all listeners for that search.
 */
function emitUpdate(searchId, data) {
  emitter.emit(`search:${searchId}`, data);
}

/**
 * Subscribe to updates for a specific search.
 * Returns an unsubscribe function.
 */
function subscribe(searchId, listener) {
  emitter.on(`search:${searchId}`, listener);
  return () => {
    emitter.removeListener(`search:${searchId}`, listener);
  };
}

module.exports = {
  emitUpdate,
  subscribe,
};
