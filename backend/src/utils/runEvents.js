const EventEmitter = require('events');

const emitter = new EventEmitter();
emitter.setMaxListeners(10);

function emitUpdate(runId, data) {
  emitter.emit(`run:${runId}`, data);
}

function subscribe(runId, listener) {
  emitter.on(`run:${runId}`, listener);
  return () => {
    emitter.removeListener(`run:${runId}`, listener);
  };
}

module.exports = { emitUpdate, subscribe };
